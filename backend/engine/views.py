from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json, hashlib
from .db import get_db
import datetime
import urllib.parse
import urllib.request
import urllib.error
import base64  # Added for Bitbucket auth

@csrf_exempt
def signup(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    try:
        data = json.loads(request.body)
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        # FIX 1: Validate inputs to prevent crashes
        if not name or not email or not password:
            return JsonResponse({"error": "Name, email, and password are required"}, status=400)

        hashed = hashlib.sha256(password.encode()).hexdigest()

        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "INSERT INTO users (full_name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed)
        )
        db.commit()
        db.close()
        return JsonResponse({"message": "Signup successful"})

    except Exception as e:
        # FIX 2: Print real error to terminal for debugging
        print(f"Signup Error: {e}")
        
        # Check for specific duplicate entry error (MySQL uses code 1062)
        if "Duplicate entry" in str(e) or "1062" in str(e):
            return JsonResponse({"error": "Email already exists"}, status=400)
            
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
def login(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
         return JsonResponse({"error": "Email and password required"}, status=400)

    hashed = hashlib.sha256(password.encode()).hexdigest()

    db = get_db()
    cursor = db.cursor()

    cursor.execute(
        "SELECT id, full_name FROM users WHERE email=%s AND password=%s",
        (email, hashed)
    )
    user = cursor.fetchone()
    db.close()

    if user:
        if isinstance(user, dict):
            user_list = [user['id'], user['full_name']]
        else:
            user_list = list(user)
            
        return JsonResponse({
            "message": "Login successful",
            "user": user_list
        })
    else:
        return JsonResponse({"error": "Invalid credentials"}, status=401)


def get_tasks(request):
    user_id = request.GET.get("user_id")
    if not user_id:
        return JsonResponse({"error": "user_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    cursor.execute("SELECT id, title FROM sprints WHERE user_id = %s", (user_id,))
    sprint_map = {row["id"]: row["title"] for row in cursor.fetchall()}

    cursor.execute("SELECT * FROM tasks WHERE user_id = %s", (user_id,))
    rows = cursor.fetchall()
    db.close()

    data = {
        "todo": [],
        "progress": [],
        "review": [],
        "done": []
    }

    for t in rows:
        task = {
            "id": str(t["id"]),
            "title": t["title"],
            "priority": t["priority"],
            "dueDate": t["due_date"],
            "avatar": "https://placehold.co/32x32",
            "subtasks": {
                "completed": t["subtasks_completed"],
                "total": t["subtasks_total"]
            },
            "progress": (
                int((t["subtasks_completed"] / t["subtasks_total"]) * 100)
                if t["subtasks_total"] > 0 else 0
            ),
            "isWIP": t["status"] == "progress",
            "sprint_id": t["sprint_id"],
            "sprint_name": sprint_map.get(t["sprint_id"])
        }

        if t["status"] not in data:
            continue
        data[t["status"]].append(task)

    return JsonResponse(data)


@csrf_exempt
def create_task(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    try:
        data = json.loads(request.body)
        user_id = int(data.get("user_id"))
        title = data.get("title", "").strip()
        priority = data.get("priority", "Medium")
        status = data.get("status", "todo")
        due_date = data.get("due_date", "")
        subtasks_total = int(data.get("subtasks_total", 0))
        sprint_id = int(data["sprint_id"]) if data.get("sprint_id") else None

        db = get_db()
        cursor = db.cursor()

        cursor.execute("""
            INSERT INTO tasks 
            (user_id, title, priority, status, due_date, subtasks_total, subtasks_completed, sprint_id)
            VALUES (%s, %s, %s, %s, %s, %s, 0, %s)
        """, (user_id, title, priority, status, due_date, subtasks_total, sprint_id))

        db.commit()
        task_id = cursor.lastrowid
        
        sprint_name = None
        if sprint_id:
            cursor.execute("SELECT title FROM sprints WHERE id = %s", (sprint_id,))
            row = cursor.fetchone()
            if row:
                sprint_name = row["title"]
        
        db.close()

        new_task = {
            "id": str(task_id),
            "title": title,
            "priority": priority,
            "dueDate": due_date,
            "avatar": "https://placehold.co/32x32",
            "subtasks": {"completed": 0, "total": subtasks_total},
            "progress": 0,
            "isWIP": status == "progress",
            "sprint_id": sprint_id,
            "sprint_name": sprint_name
        }

        return JsonResponse({"message": "Task created", "task": new_task})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def update_task_status(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)

    db = get_db()
    cursor = db.cursor()

    cursor.execute(
        "UPDATE tasks SET status = %s WHERE id = %s",
        (data["status"], data["task_id"])
    )

    db.commit()
    db.close()

    return JsonResponse({"message": "Task status updated"})


@csrf_exempt
def increment_subtask(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    task_id = data.get("task_id")
    subtasks_completed = data.get("subtasks_completed")

    if not task_id or subtasks_completed is None:
        return JsonResponse({"error": "task_id and subtasks_completed required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT subtasks_total, subtasks_completed FROM tasks WHERE id = %s",
            (task_id,)
        )
        task = cursor.fetchone()
        
        if not task:
            return JsonResponse({"error": "Task not found"}, status=404)
        
        cursor.execute(
            "UPDATE tasks SET subtasks_completed = %s WHERE id = %s",
            (subtasks_completed, task_id)
        )
        
        auto_completed = False
        if task["subtasks_total"] > 0 and subtasks_completed >= task["subtasks_total"]:
            cursor.execute(
                "UPDATE tasks SET status = 'done' WHERE id = %s",
                (task_id,)
            )
            auto_completed = True
        
        db.commit()
        return JsonResponse({
            "message": "Subtask incremented successfully",
            "auto_completed": auto_completed
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def delete_task(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    task_id = data.get("task_id")

    if not task_id:
        return JsonResponse({"error": "task_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        db.commit()
        return JsonResponse({"message": "Task deleted successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def update_task_due_date(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    task_id = data.get("task_id")
    due_date = data.get("due_date")

    if not task_id or not due_date:
        return JsonResponse({"error": "task_id and due_date required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "UPDATE tasks SET due_date = %s WHERE id = %s",
            (due_date, task_id)
        )
        db.commit()
        return JsonResponse({"message": "Task due date updated successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def update_priority(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    task_id = data.get("task_id")
    priority = data.get("priority")

    if not task_id or not priority:
        return JsonResponse({"error": "task_id and priority required"}, status=400)

    if priority not in ["High", "Medium", "Low"]:
        return JsonResponse({"error": "Invalid priority"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "UPDATE tasks SET priority = %s WHERE id = %s",
            (priority, task_id)
        )
        db.commit()
        return JsonResponse({"message": "Priority updated successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def get_sprints(request):
    user_id = request.GET.get("user_id")
    if not user_id:
        return JsonResponse({"error": "user_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT * FROM sprints WHERE user_id = %s ORDER BY id",
            (user_id,)
        )
        rows = cursor.fetchall()
        
        if not rows:
            return JsonResponse({"sprints": [], "project_title": "", "current_sprint": None}, status=200)
        
        sprints = []
        project_title = ""
        current_sprint = None
        today = datetime.date.today()
        
        for row in rows:
            if not project_title:
                project_title = row.get("project_title", "My Project")
            
            sprint_id = row["id"]
            
            cursor.execute(
                "SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as completed FROM tasks WHERE sprint_id = %s",
                (sprint_id,)
            )
            task_stats = cursor.fetchone()
            
            sprint_data = {
                "id": sprint_id,
                "title": row["title"],
                "start_date": row["start_date"],
                "end_date": row["end_date"],
                "task_count": task_stats["total"] or 0,
                "completed_count": task_stats["completed"] or 0
            }
            
            if row["start_date"] and row["end_date"]:
                start = datetime.datetime.strptime(str(row["start_date"]), "%Y-%m-%d").date()
                end = datetime.datetime.strptime(str(row["end_date"]), "%Y-%m-%d").date()
                if start <= today <= end:
                    current_sprint = sprint_data
            
            sprints.append(sprint_data)
        
        return JsonResponse({
            "sprints": sprints,
            "project_title": project_title,
            "current_sprint": current_sprint
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def create_sprints(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    user_id = data.get("user_id")
    project_title = data.get("project_title", "My Project")
    sprints = data.get("sprints", [])

    if not user_id or not sprints:
        return JsonResponse({"error": "user_id and sprints required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("DELETE FROM sprints WHERE user_id = %s", (user_id,))
        
        for sprint in sprints:
            cursor.execute(
                """INSERT INTO sprints (user_id, project_title, title, start_date, end_date)
                   VALUES (%s, %s, %s, %s, %s)""",
                (user_id, project_title, sprint["title"], sprint["start_date"], sprint["end_date"])
            )
        
        db.commit()
        return JsonResponse({"message": "Sprints created successfully"})
    except Exception as e:
        db.rollback()
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def delete_sprints(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    user_id = data.get("user_id")

    if not user_id:
        return JsonResponse({"error": "user_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("DELETE FROM sprints WHERE user_id = %s", (user_id,))
        db.commit()
        return JsonResponse({"message": "Sprints deleted successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def assign_task_to_sprint(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    task_id = data.get("task_id")
    sprint_id = data.get("sprint_id")

    if not task_id:
        return JsonResponse({"error": "task_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        sprint_name = None
        if sprint_id:
            cursor.execute("SELECT title FROM sprints WHERE id = %s", (sprint_id,))
            sprint_row = cursor.fetchone()
            if sprint_row:
                sprint_name = sprint_row["title"]
        
        cursor.execute(
            "UPDATE tasks SET sprint_id = %s WHERE id = %s",
            (sprint_id, task_id)
        )
        db.commit()
        
        return JsonResponse({
            "message": "Task assigned to sprint successfully",
            "sprint_name": sprint_name
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def fix_completed_tasks(request):
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute("""
            UPDATE tasks 
            SET status = 'done' 
            WHERE subtasks_total > 0 
            AND subtasks_completed >= subtasks_total 
            AND status != 'done'
        """)
        
        affected = cursor.rowcount
        db.commit()
        
        return JsonResponse({
            "message": f"Fixed {affected} completed tasks",
            "count": affected
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def get_sprint_report(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET only"}, status=405)

    user_id = request.GET.get("user_id")
    if not user_id:
        return JsonResponse({"error": "user_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("""
            SELECT id, title, start_date, end_date 
            FROM sprints 
            WHERE user_id = %s 
            ORDER BY id DESC 
            LIMIT 10
        """, (user_id,))
        sprints = cursor.fetchall()

        if not sprints:
            return JsonResponse({
                "historical": [],
                "current_burndown": [],
                "task_distribution": [],
                "summary": {"avg_velocity": 0, "completion_rate": 0, "total_tasks": 0, "bug_ratio": 0}
            })

        sprint_ids = [s["id"] for s in sprints]

        sprint_stats = []
        for sprint in sprints:
            sprint_id = sprint["id"]

            cursor.execute("""
                SELECT 
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
                    SUM(CASE WHEN priority = 'High' AND status != 'done' THEN 1 ELSE 0 END) as open_bugs_estimate,
                    SUM(CASE WHEN title LIKE '%%refactor%%' OR title LIKE '%%tech debt%%' THEN 1 ELSE 0 END) as tech_debt_items
                FROM tasks 
                WHERE sprint_id = %s
            """, (sprint_id,))
            stats = cursor.fetchone() or {}

            committed = stats["total_tasks"] or 0
            completed = stats["completed_tasks"] or 0
            bugs = stats["open_bugs_estimate"] or 0
            tech_debt = round((stats["tech_debt_items"] or 0) / max(committed, 1) * 100, 1)

            is_current = False
            if sprint["start_date"] and sprint["end_date"]:
                today = datetime.date.today()
                start = datetime.datetime.strptime(str(sprint["start_date"]), "%Y-%m-%d").date()
                end = datetime.datetime.strptime(str(sprint["end_date"]), "%Y-%m-%d").date()
                is_current = start <= today <= end

            sprint_stats.append({
                "name": sprint["title"],
                "committed": committed,
                "completed": completed,
                "bugs": bugs,
                "techDebt": tech_debt,
                "is_current": is_current
            })

        current_sprint = next((s for s in sprint_stats if s["is_current"]), None)
        burndown = []
        if current_sprint and current_sprint["committed"] > 0:
            remaining = current_sprint["committed"] - current_sprint["completed"]
            days = 7
            for i in range(days + 1):
                ideal = max(0, current_sprint["committed"] * (1 - i / days))
                actual_remaining = max(0, remaining - (remaining * (i / days) * 0.7))
                burndown.append({
                    "day": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7],
                    "ideal": round(ideal),
                    "remaining": round(actual_remaining)
                })
        else:
            for i in range(8):
                burndown.append({
                    "day": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7],
                    "ideal": 0,
                    "remaining": 0
                })

        task_distribution = []
        if sprint_ids:
            placeholders = ','.join(['%s'] * len(sprint_ids))
            query = f"""
                SELECT 
                    CASE 
                        WHEN title LIKE '%%bug%%' OR title LIKE '%%fix%%' OR title LIKE '%%error%%' THEN 'Bugs'
                        WHEN title LIKE '%%refactor%%' OR title LIKE '%%tech debt%%' OR title LIKE '%%clean%%' THEN 'Tech Debt'
                        WHEN title LIKE '%%research%%' OR title LIKE '%%spike%%' THEN 'Research'
                        ELSE 'Features'
                    END as type,
                    COUNT(*) as count
                FROM tasks
                WHERE sprint_id IN ({placeholders})
                GROUP BY type
            """
            cursor.execute(query, tuple(sprint_ids))
            dist_rows = cursor.fetchall()

            if dist_rows:
                total = sum(r["count"] for r in dist_rows)
                colors = {
                    "Features": "#7c3aed",
                    "Bugs": "#ef4444",
                    "Tech Debt": "#f59e0b",
                    "Research": "#10b981"
                }
                for row in dist_rows:
                    task_distribution.append({
                        "name": row["type"],
                        "value": round((row["count"] / total) * 100),
                        "color": colors.get(row["type"], "#6b7280")
                    })
            else:
                task_distribution = [
                    {"name": "Features", "value": 100, "color": "#7c3aed"}
                ]

        total_committed = sum(s["committed"] for s in sprint_stats)
        total_completed = sum(s["completed"] for s in sprint_stats)
        avg_velocity = round(total_completed / len(sprint_stats)) if sprint_stats else 0
        completion_rate = round((total_completed / total_committed) * 100) if total_committed > 0 else 0
        total_bugs = sum(s["bugs"] for s in sprint_stats)
        bug_ratio = round((total_bugs / max(total_committed, 1)) * 100, 1)

        return JsonResponse({
            "historical": sprint_stats,
            "current_burndown": burndown,
            "task_distribution": task_distribution,
            "summary": {
                "avg_velocity": avg_velocity,
                "completion_rate": completion_rate,
                "total_tasks": total_committed,
                "bug_ratio": bug_ratio
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def get_summary(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET only"}, status=405)

    user_id = request.GET.get("user_id")
    if not user_id:
        return JsonResponse({"error": "user_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE user_id = %s AND status != 'done'", (user_id,))
        open_tasks = cursor.fetchone()["count"]

        today = datetime.date.today()
        cursor.execute("""
            SELECT COUNT(*) as count FROM tasks 
            WHERE user_id = %s AND status != 'done' AND due_date < %s AND due_date != ''
        """, (user_id, today))
        overdue = cursor.fetchone()["count"]

        cursor.execute("""
            SELECT COUNT(*) as count FROM sprints 
            WHERE user_id = %s AND start_date <= %s AND end_date >= %s
        """, (user_id, today, today))
        sprints_active = cursor.fetchone()["count"]

        week_ago = today - datetime.timedelta(days=7)
        cursor.execute("""
            SELECT COUNT(*) as count FROM tasks 
            WHERE user_id = %s AND status = 'done' AND due_date >= %s
        """, (user_id, week_ago))
        completed_this_week = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM sprints WHERE user_id = %s", (user_id,))
        total_sprints = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as total FROM tasks WHERE user_id = %s", (user_id,))
        total_tasks = cursor.fetchone()["total"]
        cursor.execute("SELECT COUNT(*) as done FROM tasks WHERE user_id = %s AND status = 'done'", (user_id,))
        done_tasks = cursor.fetchone()["done"]
        completion_rate = round((done_tasks / total_tasks) * 100) if total_tasks > 0 else 0

        cursor.execute("""
            SELECT id, title, status, priority, due_date 
            FROM tasks 
            WHERE user_id = %s 
            ORDER BY id DESC 
            LIMIT 10
        """, (user_id,))
        recent_tasks = cursor.fetchall()

        recent_activity = []
        for task in recent_tasks[:5]:
            time_diff = datetime.datetime.now() - datetime.datetime.now()
            days_ago = abs(time_diff.days) if time_diff.days != 0 else 0
            
            if task["status"] == "done":
                msg = f'Completed "{task["title"]}"'
                activity_type = "completed"
            elif task["status"] == "progress":
                msg = f'Moved "{task["title"]}" to In Progress'
                activity_type = "status_change"
            else:
                msg = f'Created task "{task["title"]}"'
                activity_type = "created"
            
            time_ago = f"{days_ago} days ago" if days_ago > 0 else "Today"
            
            recent_activity.append({
                "message": msg,
                "time_ago": time_ago,
                "type": activity_type
            })

        return JsonResponse({
            "stats": {
                "open_tasks": open_tasks,
                "overdue": overdue,
                "sprints_active": sprints_active,
                "completed_this_week": completed_this_week,
                "total_sprints": total_sprints,
                "completion_rate": completion_rate
            },
            "recent_activity": recent_activity
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def archive_task(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    task_id = data.get("task_id")

    if not task_id:
        return JsonResponse({"error": "task_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("SELECT status FROM tasks WHERE id = %s", (task_id,))
        row = cursor.fetchone()
        if not row:
            return JsonResponse({"error": "Task not found"}, status=404)

        current_status = row["status"]

        cursor.execute(
            "UPDATE tasks SET previous_status = %s, status = 'archived' WHERE id = %s",
            (current_status, task_id)
        )
        db.commit()
        return JsonResponse({"message": "Task archived successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def unarchive_task(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    task_id = data.get("task_id")

    if not task_id:
        return JsonResponse({"error": "task_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("SELECT previous_status FROM tasks WHERE id = %s", (task_id,))
        row = cursor.fetchone()
        if not row:
            return JsonResponse({"error": "Task not found"}, status=404)

        restore_status = row["previous_status"] or "todo"

        cursor.execute(
            "UPDATE tasks SET status = %s, previous_status = NULL WHERE id = %s",
            (restore_status, task_id)
        )
        db.commit()
        return JsonResponse({
            "message": "Task unarchived successfully",
            "restored_to": restore_status
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def get_archived_tasks(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET only"}, status=400)

    user_id = request.GET.get("user_id")
    if not user_id:
        return JsonResponse({"error": "user_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("SELECT id, title FROM sprints WHERE user_id = %s", (user_id,))
        sprint_map = {row["id"]: row["title"] for row in cursor.fetchall()}

        cursor.execute(
            "SELECT * FROM tasks WHERE user_id = %s AND status = 'archived'",
            (user_id,)
        )
        rows = cursor.fetchall()

        tasks = []
        for t in rows:
            tasks.append({
                "id": str(t["id"]),
                "title": t["title"],
                "priority": t["priority"],
                "due_date": str(t["due_date"]) if t["due_date"] else "",
                "sprint_id": t["sprint_id"],
                "sprint_name": sprint_map.get(t["sprint_id"]),
                "previous_status": t.get("previous_status") or "todo",
                "subtasks": {
                    "completed": t["subtasks_completed"],
                    "total": t["subtasks_total"]
                }
            })

        return JsonResponse({"tasks": tasks})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def get_pages(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET only"}, status=405)

    user_id = request.GET.get("user_id")
    if not user_id:
        return JsonResponse({"error": "user_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT id, title, body, created_at, updated_at FROM pages WHERE user_id = %s ORDER BY updated_at DESC",
            (user_id,)
        )
        rows = cursor.fetchall()
        pages = []
        for row in rows:
            pages.append({
                "id": row["id"],
                "title": row["title"],
                "body": row["body"] or "",
                "created_at": str(row["created_at"]),
                "updated_at": str(row["updated_at"]),
            })
        return JsonResponse({"pages": pages})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def create_page(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    user_id = data.get("user_id")
    title = data.get("title", "").strip()
    body = data.get("body", "")

    if not user_id or not title:
        return JsonResponse({"error": "user_id and title required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "INSERT INTO pages (user_id, title, body) VALUES (%s, %s, %s)",
            (user_id, title, body)
        )
        db.commit()
        page_id = cursor.lastrowid

        cursor.execute("SELECT id, title, body, created_at, updated_at FROM pages WHERE id = %s", (page_id,))
        row = cursor.fetchone()

        return JsonResponse({
            "message": "Page created",
            "page": {
                "id": row["id"],
                "title": row["title"],
                "body": row["body"] or "",
                "created_at": str(row["created_at"]),
                "updated_at": str(row["updated_at"]),
            }
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def update_page(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    page_id = data.get("page_id")
    title = data.get("title", "").strip()
    body = data.get("body", "")

    if not page_id:
        return JsonResponse({"error": "page_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "UPDATE pages SET title = %s, body = %s WHERE id = %s",
            (title, body, page_id)
        )
        db.commit()
        return JsonResponse({"message": "Page updated"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def delete_page(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    page_id = data.get("page_id")

    if not page_id:
        return JsonResponse({"error": "page_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("DELETE FROM pages WHERE id = %s", (page_id,))
        db.commit()
        return JsonResponse({"message": "Page deleted"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def get_integrations(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET only"}, status=405)

    user_id = request.GET.get("user_id")
    if not user_id:
        return JsonResponse({"error": "user_id required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT platform, repo_url, connected_at FROM integrations WHERE user_id = %s",
            (user_id,)
        )
        rows = cursor.fetchall()
        integrations = {
            row["platform"]: {
                "repo_url": row["repo_url"],
                "connected_at": str(row["connected_at"])
            }
            for row in rows
        }
        return JsonResponse({"integrations": integrations})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def save_integration(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    user_id = data.get("user_id")
    platform = data.get("platform")
    repo_url = data.get("repo_url", "").strip()
    access_token = data.get("access_token", "").strip()

    if not user_id or not platform or not repo_url:
        return JsonResponse({"error": "user_id, platform and repo_url required"}, status=400)

    if platform not in ["github", "gitlab", "bitbucket"]:
        return JsonResponse({"error": "Invalid platform"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("""
            INSERT INTO integrations (user_id, platform, repo_url, access_token)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE repo_url = %s, access_token = %s, connected_at = CURRENT_TIMESTAMP
        """, (user_id, platform, repo_url, access_token, repo_url, access_token))
        db.commit()
        return JsonResponse({"message": f"{platform} connected successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def delete_integration(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    user_id = data.get("user_id")
    platform = data.get("platform")

    if not user_id or not platform:
        return JsonResponse({"error": "user_id and platform required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "DELETE FROM integrations WHERE user_id = %s AND platform = %s",
            (user_id, platform)
        )
        db.commit()
        return JsonResponse({"message": f"{platform} disconnected"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


def _extract_github_repo(url):
    """Extract owner/repo from GitHub URL"""
    url = url.rstrip("/")
    parts = url.replace("https://github.com/", "").replace("http://github.com/", "").split("/")
    if len(parts) >= 2:
        return f"{parts[0]}/{parts[1]}"
    return None


def _extract_gitlab_repo(url):
    """Extract namespace/project from GitLab URL"""
    url = url.rstrip("/")
    path = url.replace("https://gitlab.com/", "").replace("http://gitlab.com/", "")
    return path if path else None


def _extract_bitbucket_repo(url):
    """Extract workspace/repo from Bitbucket URL"""
    url = url.rstrip("/")
    parts = url.replace("https://bitbucket.org/", "").replace("http://bitbucket.org/", "").split("/")
    if len(parts) >= 2:
        return parts[0], parts[1]
    return None, None


def _fetch_json(url, headers=None):
    """Simple HTTP GET returning parsed JSON"""
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise Exception(f"HTTP {e.code}: {e.reason}")
    except Exception as e:
        raise Exception(str(e))


@csrf_exempt
def get_repo_data(request):
    """Fetch live repo data (commits, PRs, branches, stats) for a specific repo URL"""
    if request.method != "GET":
        return JsonResponse({"error": "GET only"}, status=405)

    user_id = request.GET.get("user_id")
    platform = request.GET.get("platform")
    repo_url = request.GET.get("repo_url")

    if not user_id or not platform or not repo_url:
        return JsonResponse({"error": "user_id, platform and repo_url required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT access_token FROM integrations WHERE user_id = %s AND platform = %s",
            (user_id, platform)
        )
        row = cursor.fetchone()
        if not row:
            return JsonResponse({"error": "Integration not found"}, status=404)

        token = row["access_token"] or ""
        result = {}

        # FIX 3: Implemented the logic for all 3 platforms
        if platform == "github":
            repo = _extract_github_repo(repo_url)
            if repo:
                headers = {"Authorization": f"Bearer {token}", "User-Agent": "BrainMint"}
                
                # Fetch last 5 commits
                commits_data = _fetch_json(f"https://api.github.com/repos/{repo}/commits?per_page=5", headers)
                result["commits"] = [
                    {
                        "message": c["commit"]["message"].split("\n")[0],
                        "author": c["commit"]["author"]["name"],
                        "date": c["commit"]["author"]["date"][:10],
                        "url": c["html_url"]
                    } for c in commits_data
                ]
                
                # Fetch last 5 PRs
                prs_data = _fetch_json(f"https://api.github.com/repos/{repo}/pulls?state=open&per_page=5", headers)
                result["prs"] = [
                    {
                        "title": pr["title"],
                        "author": pr["user"]["login"],
                        "url": pr["html_url"],
                        "created_at": pr["created_at"][:10]
                    } for pr in prs_data
                ]

        elif platform == "gitlab":
            path = _extract_gitlab_repo(repo_url)
            if path:
                # GitLab needs URL encoded path
                safe_path = urllib.parse.quote(path, safe='')
                headers = {"PRIVATE-TOKEN": token}
                
                commits_data = _fetch_json(f"https://gitlab.com/api/v4/projects/{safe_path}/repository/commits?per_page=5", headers)
                result["commits"] = [
                    {
                        "message": c["title"],
                        "author": c["author_name"],
                        "date": c["created_at"][:10],
                        "url": c["web_url"]
                    } for c in commits_data
                ]
                
                mrs_data = _fetch_json(f"https://gitlab.com/api/v4/projects/{safe_path}/merge_requests?state=opened&per_page=5", headers)
                result["prs"] = [
                    {
                        "title": mr["title"],
                        "author": mr["author"]["name"],
                        "url": mr["web_url"],
                        "created_at": mr["created_at"][:10]
                    } for mr in mrs_data
                ]

        elif platform == "bitbucket":
            workspace, repo_slug = _extract_bitbucket_repo(repo_url)
            if workspace and repo_slug:
                encoded_token = base64.b64encode(token.encode()).decode()
                headers = {"Authorization": f"Basic {encoded_token}"}
                
                commits_data = _fetch_json(f"https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/commits?pagelen=5", headers)
                result["commits"] = [
                    {
                        "message": c["message"].split("\n")[0],
                        "author": c["author"]["user"]["display_name"] if "user" in c["author"] else "Unknown",
                        "date": c["date"][:10],
                        "url": c["links"]["html"]["href"]
                    } for c in commits_data.get("values", [])
                ]
                
                prs_data = _fetch_json(f"https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests?state=OPEN&pagelen=5", headers)
                result["prs"] = [
                    {
                        "title": pr["title"],
                        "author": pr["author"]["display_name"],
                        "url": pr["links"]["html"]["href"],
                        "created_at": pr["created_on"][:10]
                    } for pr in prs_data.get("values", [])
                ]

        return JsonResponse({"data": result})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()


@csrf_exempt
def get_all_repos(request):
    """Fetch all repositories for a connected platform"""
    if request.method != "GET":
        return JsonResponse({"error": "GET only"}, status=405)

    user_id = request.GET.get("user_id")
    platform = request.GET.get("platform")

    if not user_id or not platform:
        return JsonResponse({"error": "user_id and platform required"}, status=400)

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT access_token FROM integrations WHERE user_id = %s AND platform = %s",
            (user_id, platform)
        )
        row = cursor.fetchone()
        if not row or not row["access_token"]:
            return JsonResponse({"error": "Integration not found or no token"}, status=404)

        token = row["access_token"]
        repos = []

        if platform == "github":
            headers = {
                "Accept": "application/vnd.github+json",
                "User-Agent": "BrainMint",
                "Authorization": f"Bearer {token}"
            }
            
            user_repos = _fetch_json("https://api.github.com/user/repos?per_page=100&sort=updated", headers)
            
            for repo in user_repos:
                repos.append({
                    "name": repo["full_name"],
                    "url": repo["html_url"],
                    "description": repo.get("description", ""),
                    "stars": repo.get("stargazers_count", 0),
                    "language": repo.get("language", ""),
                    "updated_at": repo["updated_at"][:10],
                    "is_private": repo.get("private", False)
                })

        elif platform == "gitlab":
            headers = {
                "User-Agent": "BrainMint",
                "PRIVATE-TOKEN": token
            }
            
            projects = _fetch_json("https://gitlab.com/api/v4/projects?membership=true&per_page=100&order_by=updated_at", headers)
            
            for proj in projects:
                repos.append({
                    "name": proj["path_with_namespace"],
                    "url": proj["web_url"],
                    "description": proj.get("description", ""),
                    "stars": proj.get("star_count", 0),
                    "language": "",
                    "updated_at": proj["last_activity_at"][:10],
                    "is_private": proj.get("visibility") != "public"
                })

        elif platform == "bitbucket":
            import base64
            encoded_token = base64.b64encode(token.encode()).decode()
            headers = {
                "User-Agent": "BrainMint",
                "Authorization": f"Basic {encoded_token}"
            }
            
            data = _fetch_json("https://api.bitbucket.org/2.0/repositories?role=member&pagelen=100", headers)
            
            for repo in data.get("values", []):
                repos.append({
                    "name": repo["full_name"],
                    "url": repo["links"]["html"]["href"],
                    "description": repo.get("description", ""),
                    "stars": 0,
                    "language": repo.get("language", ""),
                    "updated_at": repo["updated_on"][:10],
                    "is_private": repo.get("is_private", False)
                })

        return JsonResponse({"repos": repos})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        db.close()
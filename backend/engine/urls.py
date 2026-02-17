from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path("signup/", views.signup, name="signup"),
    path("login/", views.login, name="login"),

    # Tasks Endpoints
    path("tasks/", views.get_tasks, name="get_tasks"),
    path("tasks/create/", views.create_task, name="create_task"),
    path("tasks/update-status/", views.update_task_status, name="update_task_status"),
    path("tasks/increment-subtask/", views.increment_subtask, name="increment_subtask"),
    path("tasks/delete/", views.delete_task, name="delete_task"),
    path("tasks/update-priority/", views.update_priority, name="update_priority"),
    path("tasks/assign-sprint/", views.assign_task_to_sprint, name="assign_task_to_sprint"),

    # Sprints Endpoints
    path("sprints/", views.get_sprints, name="get_sprints"),
    path("sprints/create/", views.create_sprints, name="create_sprints"),
    path("sprints/delete/", views.delete_sprints, name="delete_sprints"),

    # Reports & Analytics
    path("sprint-report/", views.get_sprint_report, name="sprint_report"),


    path('summary/', views.get_summary, name='summary'),


    # ADD THESE 3 lines inside your urlpatterns list in urls.py

    path("tasks/archived/", views.get_archived_tasks, name="get_archived_tasks"),
    path("tasks/archive/", views.archive_task, name="archive_task"),
    path("tasks/unarchive/", views.unarchive_task, name="unarchive_task"),
    path("tasks/update-due-date/", views.update_task_due_date, name="update_task_due_date"),

    # ADD THESE to your urlpatterns in urls.py

    path("pages/", views.get_pages, name="get_pages"),
    path("pages/create/", views.create_page, name="create_page"),
    path("pages/update/", views.update_page, name="update_page"),
    path("pages/delete/", views.delete_page, name="delete_page"),

    # ADD THESE to your urlpatterns in urls.py

    path("integrations/", views.get_integrations, name="get_integrations"),
    path("integrations/save/", views.save_integration, name="save_integration"),
    path("integrations/delete/", views.delete_integration, name="delete_integration"),
    path("integrations/repo-data/", views.get_repo_data, name="get_repo_data"),
    path("integrations/repos/", views.get_all_repos, name="get_all_repos"),

    
]
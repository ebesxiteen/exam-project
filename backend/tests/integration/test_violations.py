"""T23-T25: Vi phạm trong thi và SSE stream."""
from .conftest import headers, login


def test_t23_student_reports_violation(client, new_student, exam):
    _, student = new_student()
    # Bắt đầu bài làm
    r = client.post(f"/api/v1/exams/{exam['id']}/attempts", headers=student)
    assert r.status_code in (200, 201)
    attempt_id = r.json()["id"]

    r = client.post(f"/api/v1/attempts/{attempt_id}/violations", headers=student,
                    json={"type": "tab_switch"})
    assert r.status_code == 201
    data = r.json()
    assert data["type"] == "tab_switch"
    assert data["attempt_id"] == attempt_id


def test_t24_student_cannot_report_other_attempt(client, new_student, exam):
    _, s1 = new_student()
    _, s2 = new_student()
    r = client.post(f"/api/v1/exams/{exam['id']}/attempts", headers=s1)
    attempt_id = r.json()["id"]

    r = client.post(f"/api/v1/attempts/{attempt_id}/violations", headers=s2,
                    json={"type": "tab_switch"})
    assert r.status_code == 404


def test_t25_stream_requires_teacher(client, new_student, exam):
    _, student = new_student()
    r = client.get(f"/api/v1/exams/{exam['id']}/violations/stream", headers=student)
    assert r.status_code == 403

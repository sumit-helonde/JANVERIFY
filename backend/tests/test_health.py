import json


def test_health_exact_json(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "janverify-api"}


def test_health_exact_body_bytes(client):
    res = client.get("/api/health")
    assert res.headers["content-type"].startswith("application/json")
    assert json.loads(res.content) == {"status": "ok", "service": "janverify-api"}


def test_health_rejects_post(client):
    res = client.post("/api/health")
    assert res.status_code == 405


def test_health_has_exactly_two_fields(client):
    res = client.get("/api/health")
    body = res.json()
    assert set(body.keys()) == {"status", "service"}
    assert body["status"] == "ok"
    assert body["service"] == "janverify-api"
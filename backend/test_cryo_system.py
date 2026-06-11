# -*- coding: utf-8 -*-
"""Cryo Management System - Full API Test Suite"""
import requests
import sys

BASE = "http://127.0.0.1:5000"
passed = 0
failed = 0

def test(name, fn):
    global passed, failed
    try:
        fn()
        passed += 1
        print(f"  PASS {name}")
    except AssertionError as e:
        failed += 1
        print(f"  FAIL {name}: {e}")
    except Exception as e:
        failed += 1
        print(f"  ERROR {name}: {e}")

def login(username="admin", password="admin123"):
    r = requests.post(f"{BASE}/api/v1/auth/login",
        json={"username": username, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()['data']['token']

def api(method, path, token=None, **kwargs):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    return requests.request(method, f"{BASE}{path}", headers=headers, **kwargs)

print("\n" + "=" * 60)
print("  Cryo Management System - Full API Test Suite")
print("=" * 60)

TOKEN = None

# ---- Auth ----
print("\n[Auth]")
test("admin login", lambda: (
    (t := login()) and (globals().__setitem__('TOKEN', t) or True)
))
test("get current user", lambda: (
    (r := api('GET', '/api/v1/auth/me', TOKEN)),
    r.status_code == 200 and r.json()['data']['username'] == 'admin'
))

# ---- Tanks ----
print("\n[Cryo Tanks]")
tank_id = None

test("create tank", lambda: (
    (r := api('POST', '/api/v1/cryo-tanks', TOKEN,
        json={"name": "TestTank", "description": "API test"})),
    r.status_code == 200, r.json()['code'] == 200,
    globals().__setitem__('tank_id', r.json()['data']['id'])
))
test("list tanks", lambda: (
    (r := api('GET', '/api/v1/cryo-tanks', TOKEN)),
    r.status_code == 200, len(r.json()['data']['items']) >= 1
))
test("update tank", lambda: (
    (r := api('PUT', f'/api/v1/cryo-tanks/{tank_id}', TOKEN,
        json={"name": "TestTank-Renamed"})),
    r.status_code == 200
))

# ---- Boxes ----
print("\n[Cryo Boxes]")
box_id = None

test("create box", lambda: (
    (r := api('POST', f'/api/v1/cryo-tanks/{tank_id}/boxes', TOKEN,
        json={"box_name": "TestBox", "box_description": "test", "columns": []})),
    r.status_code == 200,
    globals().__setitem__('box_id', r.json()['data']['id'])
))
test("list boxes", lambda: (
    (r := api('GET', f'/api/v1/cryo-tanks/{tank_id}/boxes', TOKEN)),
    r.status_code == 200, len(r.json()['data']['boxes']) >= 1
))
test("get 9x9 grid (empty)", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    r.status_code == 200,
    (d := r.json()['data']),
    d['occupied'] == 0, d['total'] == 81,
    len(d['grid']) == 9, len(d['grid'][0]) == 9,
    d['grid'][0][0] is None
))
test("available positions = 81", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/available-positions', TOKEN)),
    r.status_code == 200, r.json()['data']['total'] == 81
))

# ---- Manual occupancy ----
print("\n[Manual Occupancy]")

test("occupy A1 (reason=reserved)", lambda: (
    (r := api('PUT', f'/api/v1/cryo-boxes/{box_id}/cells/1/1', TOKEN,
        json={"data": {"_manual": True, "_reason": "reserved"}})),
    r.status_code == 200, r.json()['data']['label'] == 'A1'
))
test("occupy B3 (reason=pending)", lambda: (
    (r := api('PUT', f'/api/v1/cryo-boxes/{box_id}/cells/2/3', TOKEN,
        json={"data": {"_manual": True, "_reason": "pending"}})),
    r.status_code == 200
))
test("occupy C5 (reason=reserved)", lambda: (
    (r := api('PUT', f'/api/v1/cryo-boxes/{box_id}/cells/3/5', TOKEN,
        json={"data": {"_manual": True, "_reason": "reserved"}})),
    r.status_code == 200
))
test("grid shows 3 occupied", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    r.json()['data']['occupied'] == 3
))
test("available = 78", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/available-positions', TOKEN)),
    r.json()['data']['total'] == 78
))
test("cell data has _manual and _reason", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    (g := r.json()['data']['grid']),
    g[0][0]['data']['_manual'] == True,
    g[0][0]['data']['_reason'] == 'reserved'
))

# ---- Clear cell ----
print("\n[Clear Cell]")

test("clear A1", lambda: (
    (r := api('DELETE', f'/api/v1/cryo-boxes/{box_id}/cells/1/1', TOKEN)),
    r.status_code == 200
))
test("A1 is now empty", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    r.json()['data']['grid'][0][0] is None
))
test("occupied back to 2", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    r.json()['data']['occupied'] == 2
))

# ---- Table + Storage Column Linking ----
print("\n[Table-Storage Linking]")
table_id = None
data_id = None

test("create table with storage column", lambda: (
    (r := api('POST', '/api/v1/tables', TOKEN,
        json={"table_name": "TestCells", "columns": [
            {"column_name": "CellName", "data_type": "string"},
            {"column_name": "Location", "data_type": "string", "is_storage": True}
        ]})),
    r.status_code == 200,
    globals().__setitem__('table_id', r.json()['data']['id'])
))
test("add data linking 2 positions", lambda: (
    (r := api('POST', f'/api/v1/tables/{table_id}/data', TOKEN,
        json={"data": {
            "CellName": "HeLa",
            "Location": {
                "_storage": True,
                "_positions": [
                    {"box_id": box_id, "row": 1, "col": 2, "label": "A2",
                     "box_name": "TestBox", "tank_name": "TestTank-Renamed", "tank_id": tank_id},
                    {"box_id": box_id, "row": 1, "col": 4, "label": "A4",
                     "box_name": "TestBox", "tank_name": "TestTank-Renamed", "tank_id": tank_id}
                ],
                "_text": "TestTank-Renamed > TestBox > A2, A4"
            }
        }})),
    r.status_code == 200,
    globals().__setitem__('data_id', r.json()['data']['id'])
))
test("grid shows 4 occupied (2 manual + 2 linked)", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    r.json()['data']['occupied'] == 4
))
test("linked cell A2 has linked_table_id", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    (g := r.json()['data']['grid']),
    (a2 := g[0][1]),
    a2 is not None,
    a2['linked_table_id'] == table_id,
    a2['linked_data_id'] == data_id
))
test("linked cell shows row data", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    (a2 := r.json()['data']['grid'][0][1]),
    a2['data']['_row_data']['CellName'] == 'HeLa'
))

# ---- Clear linked cell -> sync table ----
print("\n[Clear Linked Cell -> Sync Table]")

test("clear linked A2", lambda: (
    (r := api('DELETE', f'/api/v1/cryo-boxes/{box_id}/cells/1/2', TOKEN)),
    r.status_code == 200
))
test("table data now has only 1 position (A4)", lambda: (
    (r := api('GET', f'/api/v1/tables/{table_id}/data/{data_id}', TOKEN)),
    (loc := r.json()['data']['data']['Location']),
    len(loc['_positions']) == 1,
    loc['_positions'][0]['label'] == 'A4'
))
test("grid back to 3 occupied", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    r.json()['data']['occupied'] == 3
))

# ---- Delete table data -> release all positions ----
print("\n[Delete Table Data -> Release Positions]")

test("delete table data", lambda: (
    (r := api('DELETE', f'/api/v1/tables/{table_id}/data/{data_id}', TOKEN)),
    r.status_code == 200
))
test("A4 is now free", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    r.json()['data']['grid'][0][3] is None
))
test("grid back to 2 (manual only)", lambda: (
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', TOKEN)),
    r.json()['data']['occupied'] == 2
))

# ---- Race condition protection ----
print("\n[Race Condition]")

test("update existing cell succeeds (not a race)", lambda: (
    (r := api('PUT', f'/api/v1/cryo-boxes/{box_id}/cells/2/3', TOKEN,
        json={"data": {"_manual": True, "_reason": "updated reason"}})),
    r.status_code == 200
))

# ---- Permission tests ----
print("\n[Permissions]")

test("member cannot delete cell", lambda: (
    (mt := login("member", "member123")),
    (r := api('DELETE', f'/api/v1/cryo-boxes/{box_id}/cells/3/5', mt)),
    r.status_code == 403
))
test("member can view grid", lambda: (
    (mt := login("member", "member123")),
    (r := api('GET', f'/api/v1/cryo-boxes/{box_id}/grid', mt)),
    r.status_code == 200
))
test("member cannot create tank", lambda: (
    (mt := login("member", "member123")),
    (r := api('POST', '/api/v1/cryo-tanks', mt, json={"name": "Hack"})),
    r.status_code == 403
))

# ---- Cleanup ----
print("\n[Cleanup]")

test("delete test table", lambda: (
    (r := api('DELETE', f'/api/v1/tables/{table_id}', TOKEN)),
    r.status_code == 200
))
test("delete test box (cascades cells)", lambda: (
    (r := api('DELETE', f'/api/v1/cryo-boxes/{box_id}', TOKEN)),
    r.status_code == 200
))
test("delete test tank", lambda: (
    (r := api('DELETE', f'/api/v1/cryo-tanks/{tank_id}', TOKEN)),
    r.status_code == 200
))

# ---- Results ----
print("\n" + "=" * 60)
print(f"  Results: {passed} PASS, {failed} FAIL, {passed+failed} total")
print("=" * 60 + "\n")

sys.exit(0 if failed == 0 else 1)

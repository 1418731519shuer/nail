import json
from pathlib import Path
import cv2
import numpy as np

work = Path(r'C:\Users\chen\Documents\Codex\2026-05-08\new-chat\outputs\transfer-test-20260511')
style_img_path = work / 'target_hand.jpg'      # actually the cute nail style image
hand_img_path = work / 'source_style.png'      # actually the clean target hand image
style_json = json.loads((work / 'target_nails.json').read_text(encoding='utf-8'))
hand_json = json.loads((work / 'source_nails.json').read_text(encoding='utf-8'))

style_img = cv2.imread(str(style_img_path), cv2.IMREAD_COLOR)
hand_img = cv2.imread(str(hand_img_path), cv2.IMREAD_COLOR)
if style_img is None or hand_img is None:
    raise RuntimeError('failed to read images')

finger_order = ['pinky', 'ring', 'middle', 'index', 'thumb']

# Use only detections that the hand model can assign to a finger. This selects one visible hand from the style image.
def by_finger(data):
    out = {}
    for d in data.get('detections', []):
        a = d.get('assignment') or {}
        if not a.get('assigned'):
            continue
        finger = a.get('finger')
        if finger not in finger_order:
            continue
        # keep highest confidence per finger
        if finger not in out or float(d.get('confidence', 0)) > float(out[finger].get('confidence', 0)):
            out[finger] = d
    return out

style_by = by_finger(style_json)
hand_by = by_finger(hand_json)

# If the open-hand target assignment ever drifts, x-order is a good correction for this specific dorsal left-hand pose.
# It maps left-to-right visual nails to pinky, ring, middle, index, thumb.
target_sorted = sorted(hand_by.values(), key=lambda d: d['center'][0])
if len(target_sorted) == 5:
    hand_by = {finger: det for finger, det in zip(finger_order, target_sorted)}

# The style image's assigned hand is also left-to-right: thumb, index/ring etc can be noisy, so keep assignment first.
# If a finger is missing, fill from the selected top-hand x-order.
style_assigned = list(style_by.values())
for det in sorted(style_assigned, key=lambda d: d['center'][0]):
    pass


def mask_from_polygon(shape, polygon):
    mask = np.zeros(shape[:2], np.uint8)
    pts = np.array(polygon, dtype=np.float32)
    if pts.ndim == 2 and len(pts) >= 3:
        cv2.fillPoly(mask, [np.round(pts).astype(np.int32)], 255)
    return mask


def ordered_box(det):
    pts = np.array(det.get('oriented_box', {}).get('points') or [], dtype=np.float32)
    if pts.shape != (4, 2):
        x1, y1, x2, y2 = det['bbox']
        pts = np.array([[x1,y1],[x2,y1],[x2,y2],[x1,y2]], dtype=np.float32)
    c = pts.mean(axis=0)
    ang = np.arctan2(pts[:,1] - c[1], pts[:,0] - c[0])
    pts = pts[np.argsort(ang)]
    # rotate so first point is top-left-ish (smallest x+y) for stable perspective mapping
    start = np.argmin(pts.sum(axis=1))
    return np.roll(pts, -start, axis=0).astype(np.float32)


def feather(mask, k=21):
    m = mask.astype(np.float32) / 255.0
    if k % 2 == 0:
        k += 1
    m = cv2.GaussianBlur(m, (k, k), 0)
    return np.clip(m, 0, 1)

result = hand_img.copy().astype(np.float32)
debug = hand_img.copy()
transfers = []

for finger in ['thumb','index','middle','ring','pinky']:
    s = style_by.get(finger)
    t = hand_by.get(finger)
    if s is None or t is None:
        transfers.append({'finger': finger, 'status': 'missing', 'source': bool(s), 'target': bool(t)})
        continue

    src_mask = mask_from_polygon(style_img.shape, s.get('polygon') or [])
    dst_mask = mask_from_polygon(hand_img.shape, t.get('polygon') or [])
    if src_mask.max() == 0 or dst_mask.max() == 0:
        transfers.append({'finger': finger, 'status': 'empty_mask'})
        continue

    H = cv2.getPerspectiveTransform(ordered_box(s), ordered_box(t))
    warped_img = cv2.warpPerspective(style_img, H, (hand_img.shape[1], hand_img.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT101)
    warped_mask = cv2.warpPerspective(src_mask, H, (hand_img.shape[1], hand_img.shape[0]), flags=cv2.INTER_LINEAR)
    alpha_mask = cv2.bitwise_and(warped_mask, dst_mask)
    # shrink a little to avoid spilling over cuticles/skin, then feather edge.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5,5))
    alpha_mask = cv2.erode(alpha_mask, kernel, iterations=1)
    alpha = feather(alpha_mask, 17) * 0.92

    # Keep a little of target nail lighting for a less sticker-like result.
    warped = warped_img.astype(np.float32)
    target = result.copy()
    gray = cv2.cvtColor(hand_img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    light = 0.82 + (gray[..., None] - 0.5) * 0.22
    warped = np.clip(warped * light, 0, 255)
    result = result * (1 - alpha[..., None]) + warped * alpha[..., None]

    color = (0, 180, 255)
    cv2.polylines(debug, [np.round(np.array(t.get('polygon'), dtype=np.float32)).astype(np.int32)], True, color, 2)
    cx, cy = map(int, t['center'])
    cv2.putText(debug, finger, (cx - 28, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)
    transfers.append({'finger': finger, 'status': 'ok', 'source_id': s['id'], 'target_id': t['id'], 'source_conf': s['confidence'], 'target_conf': t['confidence']})

result = np.clip(result, 0, 255).astype(np.uint8)
cv2.imwrite(str(work / 'nail_transfer_result.jpg'), result)
cv2.imwrite(str(work / 'nail_transfer_target_debug.jpg'), debug)

# comparison canvas
h = max(style_img.shape[0], hand_img.shape[0], result.shape[0])
def fit(img, height):
    scale = height / img.shape[0]
    return cv2.resize(img, (int(img.shape[1]*scale), height), interpolation=cv2.INTER_AREA)
sep = np.full((h, 14, 3), 255, np.uint8)
canvas = np.hstack([fit(style_img, h), sep, fit(hand_img, h), sep, fit(result, h)])
cv2.imwrite(str(work / 'nail_transfer_compare.jpg'), canvas)
(work / 'nail_transfer_match.json').write_text(json.dumps(transfers, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(transfers, ensure_ascii=False, indent=2))
print(work / 'nail_transfer_result.jpg')

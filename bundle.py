"""打包前端
  输出格式：
    dist/              — 多文件
    ./index.html       — 单文件（仓库根目录，供 GitHub Pages）
"""
import json, os, shutil, re

_HERE = os.path.dirname(os.path.abspath(__file__))
_SRC = os.path.join(_HERE, "src")
_RES = os.path.join(_HERE, "resource")
_DIST = os.path.join(_HERE, "dist")
_DIST_SINGLE = _HERE

# ── 数据压缩 ──

def compress_q(q):
    opts = [{"l": o["label"], "t": o["text"], "c": o["is_correct"]} for o in q["选项"]]
    return {"i": q.get("id") or q.get("序号",""), "s": q.get("简述",""),
            "d": q.get("难度",""), "q": q.get("题目",""), "o": opts}


def html_to_plain(html_text):
    text = re.sub(r'<br\s*/?>', '\n', html_text)
    text = re.sub(r'</p>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def compress_practical(q):
    subs = []
    for s in q.get("子题目", []):
        body = s.get("题干", {})
        blanks = [{"i": b["blank_id"], "a": b["参考答案"]} for b in body.get("空白", [])]
        raw_html = body.get("html", "")
        clean = html_to_plain(raw_html) if raw_html else body.get("模板", "")
        subs.append({
            "n": s.get("子题序号", 0),
            "t": s.get("标题", s.get("标签", "")),
            "y": s.get("题型", ""),
            "b": {"p": clean, "a": blanks}
        })
    return {
        "i": q.get("id") or q.get("题号", ""),
        "s": q.get("简述", ""),
        "d": q.get("难度", ""),
        "m": {k: v for k, v in q.get("元信息", {}).items()},
        "r": q.get("阅读材料_html", ""),
        "q": subs
    }


# ── 数据生成 ──

def build_data_js():
    all_data = {"s":[], "m":[], "j":[]}
    for fname, key in [("single.json","s"),("multi.json","m"),("judge.json","j")]:
        with open(os.path.join(_RES, fname), encoding="utf-8") as f:
            all_data[key] = [compress_q(q) for q in json.load(f)]
    return "const QUESTION_DATA = " + json.dumps(all_data, ensure_ascii=False, separators=(",",":")) + ";"


def build_answers_31_js():
    """读取 3.1答案/*.md 打包为 JS 对象"""
    ans_dir = os.path.join(_RES, "3.1答案")
    if not os.path.isdir(ans_dir):
        return None
    answers = {}
    for fn in sorted(os.listdir(ans_dir)):
        if fn.endswith(".md"):
            qid = fn.replace("答案.md", "")  # "3.1.1" etc.
            path = os.path.join(ans_dir, fn)
            with open(path, encoding="utf-8") as f:
                answers[qid] = f.read()
    if not answers:
        return None
    return "var ANSWERS_31 = " + json.dumps(answers, ensure_ascii=False) + ";"


def copy_answers_31_images(dest):
    """复制 3.1答案 文件夹（含图片）到目标目录"""
    src_dir = os.path.join(_RES, "3.1答案")
    if not os.path.isdir(src_dir):
        return
    dst_dir = os.path.join(dest, "3.1答案")
    os.makedirs(dst_dir, exist_ok=True)
    for fn in os.listdir(src_dir):
        if fn.endswith(".png"):
            shutil.copy2(os.path.join(src_dir, fn), os.path.join(dst_dir, fn))
    print(f"    复制 3.1答案 图片到 {dest}")


def build_practical_data_js():
    path = os.path.join(_RES, "practical.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    compressed = [compress_practical(q) for q in raw]
    return "const PRACTICAL_DATA = " + json.dumps(compressed, ensure_ascii=False, separators=(",",":")) + ";"


# ── 输出 ──

def build_multi(data_js, prac_data_js, answers_31_js):
    """多文件版 → dist/"""
    os.makedirs(_DIST, exist_ok=True)

    with open(os.path.join(_DIST, "data.js"), "w", encoding="utf-8") as f:
        f.write(data_js)
    if prac_data_js:
        with open(os.path.join(_DIST, "data_practical.js"), "w", encoding="utf-8") as f:
            f.write(prac_data_js)
    if answers_31_js:
        with open(os.path.join(_DIST, "answers_31.js"), "w", encoding="utf-8") as f:
            f.write(answers_31_js)
    copy_answers_31_images(_DIST)

    for fn in ["index.html", "style.css", "app.js", "practical.js"]:
        src = os.path.join(_SRC, fn)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(_DIST, fn))

    total = sum(os.path.getsize(os.path.join(_DIST, f)) for f in os.listdir(_DIST))
    print(f"  dist/           多文件: {total//1024} KB")


def build_single(data_js, prac_data_js, answers_31_js):
    """单文件版 → index.html（仓库根目录，供 Pages 使用）"""
    os.makedirs(_DIST_SINGLE, exist_ok=True)

    # 读 CSS
    css_path = os.path.join(_SRC, "style.css")
    css = open(css_path, encoding="utf-8").read() if os.path.exists(css_path) else ""

    # 读 JS
    def read_js(name):
        p = os.path.join(_SRC, name)
        return open(p, encoding="utf-8").read() if os.path.exists(p) else ""

    parts = [data_js]
    if prac_data_js:
        parts.append(prac_data_js)
    if answers_31_js:
        parts.append(answers_31_js)
    parts.append(read_js("practical.js"))
    parts.append(read_js("app.js"))
    full_js = "\n".join(parts)

    copy_answers_31_images(_DIST_SINGLE)

    # 读 HTML 模板，替换 <link href=style.css> 为内联 <style>
    html_src = open(os.path.join(_SRC, "index.html"), encoding="utf-8").read()
    html_src = html_src.replace('<link rel="stylesheet" href="style.css">', f"<style>{css}</style>")
    html_src = html_src.replace('<script src="data.js"></script>', "")
    html_src = html_src.replace('<script src="data_practical.js"></script>', "")
    html_src = html_src.replace('<script src="answers_31.js"></script>', "")
    html_src = html_src.replace('<script src="practical.js"></script>', "")
    html_src = html_src.replace('<script src="app.js"></script>', f"<script>{full_js}</script>")

    out = os.path.join(_HERE, "index.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html_src)
    kb = os.path.getsize(out) // 1024
    print(f"  ./index.html    单文件: {kb} KB")


def main():
    print("打包前端…")
    data_js = build_data_js()
    prac_data_js = build_practical_data_js()
    answers_31_js = build_answers_31_js()
    build_multi(data_js, prac_data_js, answers_31_js)
    build_single(data_js, prac_data_js, answers_31_js)



    print("OK，全部完成")


if __name__ == "__main__":
    main()

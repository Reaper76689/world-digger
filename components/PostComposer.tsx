"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState } from "react";

export function PostComposer({
  placeId,
  disabled,
  onPending
}: {
  placeId: string;
  disabled: boolean;
  onPending: () => void;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setMessage("");
    const next = [...images];
    for (const file of Array.from(files).slice(0, 4 - next.length)) {
      const sign = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size })
      });
      if (!sign.ok) {
        setMessage("图片需为 JPG、PNG 或 WebP，且不超过 5MB。");
        continue;
      }
      const data = await sign.json();
      if (data.upload?.url && data.upload?.publicUrl && !data.upload?.mockOnly) {
        const upload = await fetch(data.upload.url, {
          method: data.upload.method ?? "PUT",
          headers: { "Content-Type": file.type },
          body: file
        });
        if (!upload.ok) {
          setMessage("图片上传失败，请稍后重试。");
          continue;
        }
        next.push(data.upload.publicUrl);
      } else {
        next.push(await readAsDataUrl(file));
      }
    }
    setImages(next);
  }

  async function submit() {
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/places/${placeId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, imageUrls: images })
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "发布失败");
      return;
    }
    setText("");
    setImages([]);
    setMessage("已提交审核，通过后会公开并实时推送到地点页。");
    onPending();
  }

  return (
    <section className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold">发布现场信息</h3>
          <p className="mt-1 text-sm text-ink/50">天气、人流、排队、求助、旅行建议都可以发。</p>
        </div>
        <span className="rounded-full bg-clay px-3 py-1 text-xs font-semibold text-ink/55">发前审核</span>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={disabled}
        placeholder={disabled ? "登录后发布此地点的现场信息" : "这里现在发生了什么？"}
        className="min-h-32 w-full resize-none rounded-lg border border-ink/10 bg-stone p-4 text-sm leading-6 outline-none transition focus:border-jade focus:bg-white disabled:bg-ink/5"
      />

      {images.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {images.map((image, index) => (
            <div key={image} className="relative aspect-square overflow-hidden rounded-lg border border-ink/10 bg-stone">
              <img src={image} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => setImages(images.filter((_, i) => i !== index))}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-ink shadow-sm"
                title="移除图片"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => addFiles(event.target.files)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={disabled || images.length >= 4}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink/10 px-3 text-sm font-medium transition hover:border-jade/40 hover:text-jade disabled:opacity-40"
          >
            <ImagePlus className="h-4 w-4" />
            图片
          </button>
          <span className="text-xs text-ink/45">{images.length}/4</span>
        </div>
        <button
          onClick={submit}
          disabled={disabled || loading || text.trim().length < 1}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-jade disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          提交审核
        </button>
      </div>
      {message ? <p className="mt-3 rounded-lg bg-mint px-3 py-2 text-sm text-jadeDark">{message}</p> : null}
    </section>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

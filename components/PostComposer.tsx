"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState } from "react";

export function PostComposer({
  campusId,
  spots,
  disabled,
  onPending
}: {
  campusId: string;
  spots: Array<{ id: string; name: string }>;
  disabled: boolean;
  onPending: () => void | Promise<void>;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [spotId, setSpotId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files || loading) return;
    setMessage("");
    const next = [...images];

    setLoading(true);
    try {
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
    } catch {
      setMessage("图片处理失败，请重新选择图片。");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    if (loading || disabled || text.trim().length < 1) return;
    if (!spotId) {
      setMessage("请选择一个校内地点。");
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/campuses/${campusId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, imageUrls: images, spotId })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "发布失败，请稍后重试。");
        return;
      }

      setText("");
      setImages([]);
      setMessage("已提交审核，通过后会公开 24 小时。");
      await onPending();
    } catch {
      setMessage("发布失败，请检查网络后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold">发布现场信息</h3>
          <p className="mt-1 text-sm text-ink/50">食堂排队、快递拥堵、教室占用、活动提醒都可以发。</p>
        </div>
        <span className="rounded-full bg-clay px-3 py-1 text-xs font-semibold text-ink/55">24 小时有效</span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {spots.map((spot) => (
          <button
            key={spot.id}
            type="button"
            onClick={() => setSpotId(spot.id)}
            disabled={disabled || loading}
            className={`h-10 rounded-lg border px-3 text-sm font-medium transition ${
              spotId === spot.id
                ? "border-jade bg-mint text-jadeDark"
                : "border-ink/10 bg-white text-ink/70 hover:border-jade/40 hover:text-jade"
            } disabled:opacity-40`}
          >
            {spot.name}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={disabled}
        placeholder={disabled ? "登录后发布校园现场信息" : "这里现在发生了什么？"}
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
            disabled={disabled || loading || images.length >= 4}
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
          {loading ? "提交中" : "提交审核"}
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

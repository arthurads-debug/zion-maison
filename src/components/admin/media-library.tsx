"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { UploadCloud, RotateCw, X, ImagePlus, Trash2 } from "lucide-react";
import { useResource, adminRequest, errorMessage } from "./api";
type Asset = {
  id: string;
  kind: "image" | "video";
  url: string;
  poster_url: string | null;
  alt: string;
  mime: string;
  original_path: string;
  bytes: number;
  width?: number;
  height?: number;
  published: boolean;
};
export function MediaLibrary({
  onSelect,
  embedded = false,
}: {
  onSelect?: (asset: Asset) => void;
  embedded?: boolean;
}) {
  const [page, setPage] = useState(1);
  const { rows, count, error, reload, loading } = useResource<Asset>(
    "media",
    `page=${page}`,
  );
  const [cleanupJobs, setCleanupJobs] = useState<
    { id: string; state: string; attempts: number }[]
  >([]);
  const refreshCleanup = useCallback(
    () =>
      adminRequest("media-cleanup")
        .then((d) => setCleanupJobs(d.jobs || []))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    void refreshCleanup();
  }, [refreshCleanup]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [index, setIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [ratio, setRatio] = useState("original");
  const [alt, setAlt] = useState("");
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [preview, setPreview] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  function pick(incoming: FileList | File[] | null) {
    if (!incoming?.length) return;
    const all = Array.from(incoming);
    setFiles(all);
    setIndex(0);
    editFile(all[0]);
  }
  function editFile(file: File) {
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setRotation(0);
    setRatio("original");
    setZoom(1);
    setX(50);
    setY(50);
    setAlt(file.name.replace(/\.[^.]+$/, ""));
    dialog.current?.showModal();
  }
  const crop = useCallback(
    function () {
      const img = image.current;
      if (!img || (ratio === "original" && zoom === 1)) return undefined;
      let target =
        ratio === "original"
          ? img.naturalWidth / img.naturalHeight
          : Number(ratio);
      if (ratio !== "original" && rotation % 180 !== 0) target = 1 / target;
      let width = img.naturalWidth,
        height = width / target;
      if (height > img.naturalHeight) {
        height = img.naturalHeight;
        width = height * target;
      }
      width = Math.max(1, Math.floor(width / zoom));
      height = Math.max(1, Math.floor(height / zoom));
      return {
        left: Math.round(((img.naturalWidth - width) * x) / 100),
        top: Math.round(((img.naturalHeight - height) * y) / 100),
        width,
        height,
      };
    },
    [ratio, zoom, x, y, rotation],
  );
  const draw = useCallback(
    function () {
      const el = canvas.current,
        img = image.current;
      if (!el || !img) return;
      const c = crop() || {
        left: 0,
        top: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      const rotated = rotation % 180 !== 0;
      el.width = rotated ? c.height : c.width;
      el.height = rotated ? c.width : c.height;
      const context = el.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, el.width, el.height);
      context.translate(el.width / 2, el.height / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.drawImage(
        img,
        c.left,
        c.top,
        c.width,
        c.height,
        -c.width / 2,
        -c.height / 2,
        c.width,
        c.height,
      );
    },
    [crop, rotation],
  );
  useEffect(() => {
    draw();
  }, [draw, preview]);
  async function upload() {
    const file = files[index];
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const signed = await adminRequest("media-upload", {
        action: "sign",
        mime: file.type,
        size: file.size,
      });
      const uploaded = await fetch(signed.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-upsert": "false" },
        body: file,
      });
      if (!uploaded.ok)
        throw new Error("Falha ao enviar o arquivo. Tente novamente.");
      const { asset } = await adminRequest("media-upload", {
        action: "finalize",
        path: signed.path,
        mime: file.type,
        alt,
        transform: { rotate: rotation, crop: crop() },
      });
      onSelect?.(asset);
      reload();
      if (index + 1 < files.length) {
        setIndex(index + 1);
        editFile(files[index + 1]);
      } else {
        dialog.current?.close();
        URL.revokeObjectURL(preview);
        setPreview("");
        setFiles([]);
        setMessage("Mídias enviadas e verificadas.");
      }
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const current = files[index];
  return (
    <div className={embedded ? "embedded-library" : ""}>
      {!embedded && (
        <div className="admin-page-heading">
          <div>
            <p className="eyebrow">O olhar da sua marca</p>
            <h1>Biblioteca de mídia</h1>
            <p>Fotografias, vídeos, capas e campanhas em um só lugar.</p>
          </div>
          <button
            className="button small"
            onClick={() => uploadInput.current?.click()}
          >
            <ImagePlus size={17} />
            Enviar arquivos
          </button>
        </div>
      )}
      <input
        hidden
        ref={uploadInput}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
        onChange={(e) => pick(e.target.files)}
      />
      <button
        className="upload-zone"
        onClick={() => uploadInput.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files);
        }}
      >
        <UploadCloud size={30} strokeWidth={1} />
        <strong>Arraste fotografias e vídeos ou toque para escolher</strong>
        <span>
          JPEG, PNG ou WebP até 20 MB · MP4 ou WebM otimizados até 100 MB
        </span>
      </button>
      {(error || message) && (
        <p className="notice" role="status">
          {error || message}
        </p>
      )}
      <div className="media-library-grid">
        {rows.map((asset) => (
          <article key={asset.id} className="library-asset">
            <button
              aria-label={`Selecionar ${asset.alt || "mídia"}`}
              disabled={!onSelect}
              onClick={() => onSelect?.(asset)}
            >
              {asset.kind === "image" ? (
                <img src={asset.url} alt={asset.alt} />
              ) : (
                <video
                  src={asset.url}
                  poster={asset.poster_url || undefined}
                  preload="metadata"
                  muted
                />
              )}
            </button>
            <span>{asset.alt || "Sem descrição"}</span>
            <div className="asset-actions">
              {onSelect && (
                <button className="text-link" onClick={() => onSelect(asset)}>
                  Usar mídia +
                </button>
              )}
              <button
                className="text-link"
                onClick={async () => {
                  const nextAlt = prompt(
                    "Descrição da imagem ou vídeo:",
                    asset.alt,
                  );
                  if (nextAlt === null) return;
                  let poster: string | undefined;
                  if (asset.kind === "video")
                    poster =
                      prompt("URL da capa do vídeo:", asset.poster_url || "") ||
                      undefined;
                  try {
                    await adminRequest("media", {
                      id: asset.id,
                      alt: nextAlt,
                      poster_url: poster,
                    });
                    reload();
                  } catch (e) {
                    setMessage(errorMessage(e));
                  }
                }}
              >
                Editar
              </button>
              {asset.kind === "image" && (
                <button
                  className="text-link"
                  onClick={async () => {
                    try {
                      const original = await adminRequest(
                        `media-original?id=${asset.id}`,
                      );
                      const response = await fetch(original.url);
                      if (!response.ok)
                        throw new Error(
                          "Não foi possível carregar o original.",
                        );
                      pick([
                        new File(
                          [await response.blob()],
                          `${asset.alt || "fotografia"}.${asset.mime.split("/")[1]}`,
                          { type: asset.mime },
                        ),
                      ]);
                    } catch (e) {
                      setMessage(errorMessage(e));
                    }
                  }}
                >
                  Recortar
                </button>
              )}
              <button
                className="icon-button"
                aria-label="Excluir mídia"
                onClick={async () => {
                  if (
                    !confirm(
                      "Excluir esta mídia? Arquivos vinculados a produtos não podem ser removidos.",
                    )
                  )
                    return;
                  try {
                    const result = await adminRequest(
                      "media",
                      { id: asset.id },
                      "DELETE",
                    );
                    setMessage(
                      result.cleanup_pending
                        ? "Mídia removida da biblioteca. A exclusão dos arquivos está pendente; consulte o histórico de limpeza abaixo."
                        : "Mídia e arquivos excluídos.",
                    );
                    reload();
                    void refreshCleanup();
                  } catch (e) {
                    setMessage(errorMessage(e));
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="admin-pagination">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          ← Anterior
        </button>
        <span>Página {page}</span>
        <button disabled={page * 25 >= count} onClick={() => setPage(page + 1)}>
          Próxima →
        </button>
      </div>
      {cleanupJobs.some((j) => j.state !== "delivered") && (
        <details>
          <summary>Limpeza de arquivos pendentes</summary>
          {cleanupJobs
            .filter((j) => j.state !== "delivered")
            .map((job) => (
              <div className="inventory-row" key={job.id}>
                <span>
                  {job.state} · {job.attempts} tentativas
                </span>
                <button
                  className="text-link"
                  onClick={async () => {
                    try {
                      await adminRequest("media-cleanup", { id: job.id });
                      void refreshCleanup();
                    } catch (e) {
                      setMessage(errorMessage(e));
                    }
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            ))}
        </details>
      )}
      {loading && <p className="table-empty">Carregando mídias…</p>}
      <dialog ref={dialog} className="media-editor">
        <div className="drawer-head">
          <div>
            <p className="eyebrow">
              Mídia {index + 1} de {files.length}
            </p>
            <h2>Enquadrar e preparar</h2>
          </div>
          <button
            className="icon-button"
            disabled={busy}
            aria-label="Fechar editor"
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        {current?.type.startsWith("image/") ? (
          <>
            <div className="media-preview">
              <img
                hidden
                src={preview}
                alt=""
                onLoad={(e) => {
                  image.current = e.currentTarget;
                  draw();
                }}
              />
              <canvas ref={canvas} aria-label="Prévia do enquadramento" />
            </div>
            <div className="editor-controls">
              <label>
                Proporção
                <select
                  value={ratio}
                  onChange={(e) => {
                    setRatio(e.target.value);
                  }}
                >
                  <option value="original">Original</option>
                  <option value="0.75">3:4</option>
                  <option value="0.8">4:5</option>
                  <option value="1">Quadrada</option>
                  <option value="1.7777778">16:9</option>
                </select>
              </label>
              <button
                className="button outline small"
                onClick={() => {
                  setRotation((rotation + 90) % 360);
                }}
              >
                <RotateCw size={16} />
                Girar 90°
              </button>
              <label>
                Zoom
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => {
                    setZoom(Number(e.target.value));
                  }}
                />
              </label>
              <label>
                Posição horizontal
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={x}
                  onChange={(e) => {
                    setX(Number(e.target.value));
                  }}
                />
              </label>
              <label>
                Posição vertical
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={y}
                  onChange={(e) => {
                    setY(Number(e.target.value));
                  }}
                />
              </label>
              <button className="text-link" onClick={draw}>
                Atualizar prévia
              </button>
            </div>
          </>
        ) : (
          preview && (
            <>
              <video src={preview} controls playsInline />
              <p className="notice">
                O vídeo será validado e preservado. Envie um arquivo previamente
                otimizado e cadastre sua capa na biblioteca.
              </p>
            </>
          )
        )}
        <label>
          Descrição acessível
          <input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            maxLength={300}
          />
        </label>
        {message && (
          <p role="alert" className="notice">
            {message}
          </p>
        )}
        <button className="button full" onClick={upload} disabled={busy}>
          {busy ? "Enviando e verificando…" : "Salvar mídia verificada"}
        </button>
      </dialog>
    </div>
  );
}
export type { Asset };

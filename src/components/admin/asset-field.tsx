"use client";
import { ImagePlus, Film, X } from "lucide-react";
import { imageUrl } from "@/lib/content";
export function AssetField({
  label,
  value,
  video = false,
  onChange,
  onChoose,
}: {
  label: string;
  value: string;
  video?: boolean;
  onChange: (value: string) => void;
  onChoose: () => void;
}) {
  const source = imageUrl(value);
  return (
    <fieldset className="asset-field">
      <legend>{label}</legend>
      {source ? (
        <div className="asset-field-preview">
          {video ? (
            <video src={source} controls preload="metadata" />
          ) : (
            <img src={source} alt={label} loading="lazy" />
          )}
          <button
            className="icon-button"
            aria-label={`Remover ${label.toLowerCase()}`}
            onClick={() => onChange("")}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="asset-field-empty">
          {video ? (
            <Film size={24} strokeWidth={1.3} />
          ) : (
            <ImagePlus size={24} strokeWidth={1.3} />
          )}
          <span>
            {video ? "Nenhum vídeo selecionado" : "Nenhuma imagem selecionada"}
          </span>
        </div>
      )}
      <button className="button outline small" onClick={onChoose}>
        {source ? "Trocar arquivo" : "Escolher arquivo"}
      </button>
      <details>
        <summary>Usar um link externo</summary>
        <label>
          Endereço do arquivo
          <input
            type="url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://…"
          />
        </label>
      </details>
    </fieldset>
  );
}

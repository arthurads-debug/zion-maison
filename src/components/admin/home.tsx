import Link from "next/link";
import {
  ArrowUpRight,
  Plus,
  Shirt,
  Boxes,
  ShoppingBag,
  Image as ImageIcon,
  Video,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { allowed } from "@/lib/domain";
import type { AdminProfile } from "@/server/auth";

const tasks = [
  {
    title: "Cadastrar uma peça",
    description: "Nome, fotos e preço. Veja o resultado enquanto cria.",
    href: "/admin/produtos/novo",
    permission: "products.write",
    icon: Plus,
    primary: true,
  },
  {
    title: "Cuidar dos produtos",
    description: "Edite suas peças, preços e destaques da coleção.",
    href: "/admin/produtos",
    permission: "products.read",
    icon: Shirt,
  },
  {
    title: "Atualizar o estoque",
    description: "Confira tamanhos e informe as quantidades disponíveis.",
    href: "/admin/estoque",
    permission: "stock.read",
    icon: Boxes,
  },
  {
    title: "Acompanhar atendimentos",
    description: "Veja os interesses recebidos e registre suas vendas.",
    href: "/admin/vendas",
    permission: "stock.write",
    icon: ShoppingBag,
  },
] as const;
export function AdminHome({ profile }: { profile: AdminProfile }) {
  const can = (permission: string) =>
    allowed(profile, permission) ||
    (permission.endsWith(".read") &&
      allowed(profile, permission.replace(".read", ".write")));
  return (
    <div className="admin-home">
      <div className="workspace-welcome">
        <div>
          <p className="eyebrow">BEM-VINDA À SUA MAISON</p>
          <h1>Sua loja, do seu jeito.</h1>
          <p>Um espaço simples para cuidar de cada detalhe.</p>
        </div>
        <Link href="/" target="_blank" className="button outline small">
          Ver minha loja <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="workspace-section-label">
        <span>O que vamos fazer hoje?</span>
        <span>Seu dia a dia, mais leve</span>
      </div>
      <div className="workspace-tasks">
        {tasks
          .filter((task) => can(task.permission))
          .map((task) => (
            <Link
              href={task.href}
              key={task.href}
              className={`workspace-task ${"primary" in task ? "primary" : ""}`}
            >
              <span className="task-icon">
                <task.icon size={25} strokeWidth={1.4} />
              </span>
              <h2>{task.title}</h2>
              <p>{task.description}</p>
              <span className="task-action">
                Começar <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
      </div>
      {can("content.read") && (
        <section className="workspace-showcase">
          <div>
            <p className="eyebrow">A EXPERIÊNCIA DA SUA MARCA</p>
            <h2>Uma vitrine que conta sua história.</h2>
            <p>
              Renove a primeira impressão da loja com suas imagens, textos e
              vídeos.
            </p>
          </div>
          <div className="workspace-shortcuts">
            <Link href="/admin/conteudo">
              <ImageIcon size={19} />
              Editar a página inicial <ArrowRight size={17} />
            </Link>
            <Link href="/admin/videos">
              <Video size={19} />
              Adicionar vídeos à loja <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      )}
      <details className="workspace-guide">
        <summary>
          <BookOpen size={20} />
          Primeiros passos na loja<span>Um guia rápido</span>
        </summary>
        <ol>
          <li>
            <strong>Cadastre sua peça.</strong> Preencha o nome e o preço,
            escolha as fotos e adicione cores e tamanhos. A prévia acompanha
            suas alterações.
          </li>
          <li>
            <strong>Informe as quantidades.</strong> Salve o cadastro e abra
            Estoque para registrar as unidades de cada tamanho.
          </li>
          <li>
            <strong>Coloque na vitrine.</strong> No produto, escolha Publicado
            na loja e salve. Abra sua loja para conferir o resultado.
          </li>
        </ol>
        <p>
          Use a área “Sua vitrine” no menu para organizar coleções e
          personalizar os conteúdos.
        </p>
      </details>
    </div>
  );
}

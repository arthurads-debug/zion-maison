import { Cart } from "@/components/shop/selection";
export const metadata = { title: "Minha seleção" };
export default function SelectionPage() {
  return (
    <div className="section selection-page">
      <div className="page-intro">
        <p className="eyebrow">Escolhas com intenção</p>
        <h1>Minha seleção</h1>
      </div>
      <Cart />
    </div>
  );
}

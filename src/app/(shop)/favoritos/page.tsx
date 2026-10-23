import { Favorites } from "@/components/shop/favorites";
export const metadata = { title: "Favoritos" };
export default function FavoritesPage() {
  return (
    <div className="section">
      <div className="page-intro">
        <p className="eyebrow">Para guardar e se inspirar</p>
        <h1>Seus favoritos</h1>
      </div>
      <Favorites />
    </div>
  );
}

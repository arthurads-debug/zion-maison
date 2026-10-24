import "./admin.css";
export const metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}

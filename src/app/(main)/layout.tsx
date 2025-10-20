import AppShell from "@/components/layout/AppShell";
import { useAuthContext } from "@/context/AuthContext";


export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return <AppShell>{children}</AppShell>;
}

import DashboardShell from "@/components/DashboardShell";
import { DataProvider } from "@/context/DataContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      <DashboardShell>
        {children}
      </DashboardShell>
    </DataProvider>
  );
}

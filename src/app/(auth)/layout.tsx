export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-blush/70 to-canvas to-40%">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}

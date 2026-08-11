export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} Seoyoung Park</span>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/shionpark"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <a
            href="mailto:seoy1108@gmail.com"
            className="hover:text-foreground transition-colors"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}

const navItems = [
  { label: "Life", href: "/game" },
  { label: "Money", href: "/money" },
  { label: "New life", href: "/new-life" },
  { label: "Recap", href: "/recap" },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={item.href === "/money" ? "active" : ""}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

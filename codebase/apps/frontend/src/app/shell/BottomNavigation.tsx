import { NavLink } from "react-router-dom";

import { Icon, type IconName } from "../../shared/components/Icon";

const destinations: Array<{
  icon: IconName;
  label: string;
  path: string;
}> = [
  { icon: "home", label: "Home", path: "/" },
  { icon: "report", label: "Reports", path: "/reports" },
  { icon: "flow", label: "Flow", path: "/flow" },
  { icon: "plan", label: "Budget", path: "/budget" },
  { icon: "user", label: "You", path: "/you" },
];

export function BottomNavigation() {
  return (
    <nav aria-label="Primary navigation" className="bottom-navigation">
      {destinations.map((destination) => (
        <NavLink
          className={({ isActive }) =>
            `bottom-navigation__item ${
              destination.label === "Flow" ? "bottom-navigation__item--flow" : ""
            } ${isActive ? "is-active" : ""}`
          }
          end={destination.path === "/"}
          key={destination.path}
          to={destination.path}
        >
          <span className="bottom-navigation__icon">
            <Icon name={destination.icon} size={destination.label === "Flow" ? 28 : 22} />
          </span>
          <span>{destination.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

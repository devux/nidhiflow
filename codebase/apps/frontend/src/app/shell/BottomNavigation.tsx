import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import MuiBottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import type { ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const destinations: Array<{
  icon: ReactElement;
  label: string;
  path: string;
}> = [
  { icon: <HomeRoundedIcon />, label: "Home", path: "/" },
  { icon: <AutoAwesomeRoundedIcon />, label: "Flow", path: "/flow" },
  { icon: <PersonRoundedIcon />, label: "You", path: "/you" },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath =
    destinations.find((destination) =>
      destination.path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(destination.path),
    )?.path ?? false;

  return (
    <Paper
      aria-label="Primary navigation"
      className="bottom-navigation"
      component="nav"
      elevation={0}
    >
      <MuiBottomNavigation
        showLabels
        value={currentPath}
        onChange={(_event, nextPath: string) => {
          void navigate(nextPath);
        }}
      >
        {destinations.map((destination) => (
          <BottomNavigationAction
            icon={destination.icon}
            key={destination.path}
            label={destination.label}
            value={destination.path}
          />
        ))}
      </MuiBottomNavigation>
    </Paper>
  );
}

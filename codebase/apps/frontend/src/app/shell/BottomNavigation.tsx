import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import CallMadeRoundedIcon from "@mui/icons-material/CallMadeRounded";
import CallReceivedRoundedIcon from "@mui/icons-material/CallReceivedRounded";
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
  featured?: boolean;
}> = [
  { icon: <HomeRoundedIcon />, label: "Home", path: "/" },
  {
    icon: <CallReceivedRoundedIcon />,
    label: "Add income",
    path: "/transactions/new?type=income",
  },
  {
    featured: true,
    icon: <CallMadeRoundedIcon />,
    label: "Add expense",
    path: "/transactions/new?type=expense",
  },
  {
    icon: <AccountBalanceWalletRoundedIcon />,
    label: "Budget",
    path: "/budget",
  },
  { icon: <PersonRoundedIcon />, label: "You", path: "/you" },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const transactionType = new URLSearchParams(location.search).get("type");
  const currentPath = location.pathname.startsWith("/transactions/new")
    ? transactionType === "income"
      ? "/transactions/new?type=income"
      : "/transactions/new?type=expense"
    : (destinations.find((destination) =>
        destination.path === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(destination.path),
      )?.path ?? false);

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
            className={
              destination.featured
                ? "bottom-navigation__expense-action"
                : destination.label === "Add income"
                  ? "bottom-navigation__income-action"
                  : undefined
            }
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

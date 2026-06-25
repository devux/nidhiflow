import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export function PageHeader({ action, title }: { action?: ReactNode; title: string }) {
  return (
    <Stack className="page-header" component="header" direction="row">
      <span>
        <Typography className="page-header__title" component="h1">
          {title}
        </Typography>
      </span>
      {action}
    </Stack>
  );
}

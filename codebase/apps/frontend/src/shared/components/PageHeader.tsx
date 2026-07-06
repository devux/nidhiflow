import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import { BackButton } from "./BackButton";

interface PageHeaderProps {
  action?: ReactNode;
  backTo?: string;
  title: string;
}

export function PageHeader({ action, backTo, title }: PageHeaderProps) {
  return (
    <Stack className="page-header" component="header" direction="row">
      <span className="page-header__leading">
        <BackButton to={backTo} />
        <Typography className="page-header__title" component="h1">
          {title}
        </Typography>
      </span>
      {action ? <span className="page-header__action">{action}</span> : null}
    </Stack>
  );
}

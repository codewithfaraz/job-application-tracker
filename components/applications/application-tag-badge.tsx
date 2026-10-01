import { ArrowDown, ArrowUp, Globe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_TAG_LABELS,
  type ApplicationTag,
} from "@/lib/application-tags";

const tagStyles = {
  high_priority: { variant: "success", Icon: ArrowUp },
  low_priority: { variant: "neutral", Icon: ArrowDown },
  remote: { variant: "outline", Icon: Globe },
} as const satisfies Record<ApplicationTag, unknown>;

function ApplicationTagBadge({ tag }: { tag: ApplicationTag }) {
  const { variant, Icon } = tagStyles[tag];

  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" className="size-3" strokeWidth={2.4} />
      {APPLICATION_TAG_LABELS[tag]}
    </Badge>
  );
}

export { ApplicationTagBadge };

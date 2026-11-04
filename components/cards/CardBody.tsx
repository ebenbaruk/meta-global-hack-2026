import type { Card } from "@/lib/schemas";
import { EmailBody } from "./EmailBody";
import { InsightBody } from "./InsightBody";
import { ScheduleBody } from "./ScheduleBody";
import { SnapBody } from "./SnapBody";
import { SocialPostBody } from "./SocialPostBody";
import { SponsoredBody } from "./SponsoredBody";
import { TaskBody } from "./TaskBody";
import { TeamUpdateBody } from "./TeamUpdateBody";

/** Kind-specific prepared content, rendered between the card header and the action bar. */
export function CardBody({ card }: { card: Card }) {
  switch (card.kind) {
    case "email_reply":
      return <EmailBody card={card} />;
    case "team_update":
      return <TeamUpdateBody card={card} />;
    case "schedule":
      return <ScheduleBody card={card} />;
    case "social_post":
      return <SocialPostBody card={card} />;
    case "task":
      return <TaskBody card={card} />;
    case "insight":
      return <InsightBody card={card} />;
    case "snap":
      return <SnapBody card={card} />;
    case "sponsored":
      return <SponsoredBody card={card} />;
  }
}

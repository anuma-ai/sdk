import { Model } from "@nozbe/watermelondb";
import { text, date } from "@nozbe/watermelondb/decorators";

export class PhoneCall extends Model {
  static table = "phone_calls";

  @text("call_id") callId!: string;
  @text("conversation_id") conversationId!: string;
  @text("offer_message_id") offerMessageId!: string;
  @text("status") status!: string;
  @text("request") request!: string;
  @text("response") response!: string;
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
}

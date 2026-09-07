CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"field" text,
	"before_value" jsonb,
	"after_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "audit_logs_entity_type_check" CHECK ("audit_logs"."entity_type" IN ('contract', 'contract_share'))
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" text NOT NULL,
	"version" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	CONSTRAINT "consents_consent_type_check" CHECK ("consents"."consent_type" IN ('email_notifications'))
);
--> statement-breakpoint
CREATE TABLE "contract_shares" (
	"id" uuid PRIMARY KEY NOT NULL,
	"contract_id" uuid NOT NULL,
	"grantee_email" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"granted_by" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "contract_shares_contract_grantee_unique" UNIQUE("contract_id","grantee_email"),
	CONSTRAINT "contract_shares_role_check" CHECK ("contract_shares"."role" IN ('viewer'))
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"provider" text NOT NULL,
	"start_date" date NOT NULL,
	"renewal_date" date NOT NULL,
	"cancellation_deadline" date,
	"cost" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"billing_frequency" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "contracts_category_check" CHECK ("contracts"."category" IN ('insurance', 'electricity_contract', 'gas_contract', 'mobile_contract', 'streaming_subscription', 'other')),
	CONSTRAINT "contracts_billing_frequency_check" CHECK ("contracts"."billing_frequency" IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
	CONSTRAINT "contracts_status_check" CHECK ("contracts"."status" IN ('active', 'cancelled', 'expired', 'paused', 'review_needed')),
	CONSTRAINT "contracts_cost_positive" CHECK ("contracts"."cost" >= 0),
	CONSTRAINT "contracts_renewal_after_start" CHECK ("contracts"."renewal_date" > "contracts"."start_date"),
	CONSTRAINT "contracts_cancellation_before_renewal" CHECK ("contracts"."cancellation_deadline" IS NULL OR "contracts"."cancellation_deadline" < "contracts"."renewal_date")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"reminder_id" uuid,
	"notification_type" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_preferences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"reminder_windows" jsonb DEFAULT '[90,60,30,14,7,1]'::jsonb NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"timezone" text DEFAULT 'Europe/Berlin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminder_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"contract_id" uuid NOT NULL,
	"reminder_type" text NOT NULL,
	"scheduled_date" date NOT NULL,
	"sent_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"days_before" integer NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_unique_schedule" UNIQUE("contract_id","reminder_type","days_before"),
	CONSTRAINT "reminders_reminder_type_check" CHECK ("reminders"."reminder_type" IN ('renewal_date', 'cancellation_deadline')),
	CONSTRAINT "reminders_status_check" CHECK ("reminders"."status" IN ('pending', 'sent', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"external_auth_provider" text DEFAULT 'firebase' NOT NULL,
	"external_subject_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_external_subject_id_unique" UNIQUE("external_auth_provider","external_subject_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_shares" ADD CONSTRAINT "contract_shares_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_shares" ADD CONSTRAINT "contract_shares_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_preferences" ADD CONSTRAINT "reminder_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id","created_at" DESC NULLS LAST) WHERE "audit_logs"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_consents_user_type" ON "consents" USING btree ("user_id","consent_type");--> statement-breakpoint
CREATE INDEX "idx_contract_shares_grantee_email" ON "contract_shares" USING btree ("grantee_email") WHERE "contract_shares"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_contract_shares_contract_id" ON "contract_shares" USING btree ("contract_id") WHERE "contract_shares"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_contracts_user_id" ON "contracts" USING btree ("user_id") WHERE "contracts"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_contracts_user_status" ON "contracts" USING btree ("user_id","status") WHERE "contracts"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_contracts_user_category" ON "contracts" USING btree ("user_id","category") WHERE "contracts"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_contracts_renewal_date" ON "contracts" USING btree ("renewal_date") WHERE "contracts"."deleted_at" IS NULL AND "contracts"."status" = 'active';--> statement-breakpoint
CREATE INDEX "idx_contracts_cancellation_deadline" ON "contracts" USING btree ("cancellation_deadline") WHERE "contracts"."deleted_at" IS NULL AND "contracts"."status" = 'active' AND "contracts"."cancellation_deadline" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_reminder_id" ON "notifications" USING btree ("reminder_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_sent_at" ON "notifications" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_status" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reminder_preference_user_id" ON "reminder_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_contract_id" ON "reminders" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_scheduled_date" ON "reminders" USING btree ("scheduled_date") WHERE "reminders"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_reminders_status" ON "reminders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_external_subject_id" ON "users" USING btree ("external_auth_provider","external_subject_id") WHERE "users"."deleted_at" IS NULL;
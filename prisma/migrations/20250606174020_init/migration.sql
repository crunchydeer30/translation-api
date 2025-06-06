-- CreateEnum
CREATE TYPE "editor_roles" AS ENUM ('REGULAR', 'SENIOR');

-- CreateEnum
CREATE TYPE "editor_language_pair_qualification_statuses" AS ENUM ('INITIAL_EVALUATION_REQUIRED', 'INITIAL_EVALUATION_IN_PROGRESS', 'QUALIFIED', 'NOT_QUALIFIED');

-- CreateEnum
CREATE TYPE "editor_application_statuses" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'REGISTRATION_PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "evaluation_set_statuses" AS ENUM ('IN_PROGRESS', 'READY_FOR_REVIEW', 'REVIEWING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "evaluation_difficulties" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "evaluation_types" AS ENUM ('INITIAL_QUALIFICATION', 'PERIODIC_REVIEW');

-- CreateEnum
CREATE TYPE "staff_roles" AS ENUM ('ADMIN', 'SUPPORT', 'CONTENT_MANAGER');

-- CreateEnum
CREATE TYPE "translation_stages" AS ENUM ('QUEUED_FOR_PROCESSING', 'PROCESSING', 'QUEUED_FOR_MT', 'MACHINE_TRANSLATING', 'QUEUED_FOR_EDITING', 'EDITING', 'RECONSTRUCTING', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "translation_task_statuses" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "translation_task_type" AS ENUM ('HTML', 'PLAIN_TEXT', 'XLIFF', 'SRT', 'CSV');

-- CreateEnum
CREATE TYPE "translation_statuses" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'CANCELED');

-- CreateEnum
CREATE TYPE "content_segment_types" AS ENUM ('TEXT', 'HTML_BLOCK', 'HTML_INLINE', 'XLIFF_UNIT', 'SRT_SUBTITLE', 'CSV_CELL');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token_hash" TEXT,
    "password_reset_token_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editors" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "editor_roles" NOT NULL,
    "password_reset_token_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "staff_roles" NOT NULL,
    "password_reset_token_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "language_pairs" (
    "id" UUID NOT NULL,
    "source_language_code" TEXT NOT NULL,
    "target_language_code" TEXT NOT NULL,
    "is_accepting_editors" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "language_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editor_language_pairs" (
    "id" UUID NOT NULL,
    "editor_id" UUID NOT NULL,
    "language_pair_id" UUID NOT NULL,
    "qualification_status" "editor_language_pair_qualification_statuses" NOT NULL,
    "rating" DOUBLE PRECISION,
    "last_evaluation_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editor_language_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" UUID NOT NULL,
    "status" "translation_statuses" NOT NULL DEFAULT 'PENDING',
    "customer_id" UUID NOT NULL,
    "source_language_code" TEXT NOT NULL,
    "target_language_code" TEXT NOT NULL,
    "skip_editing" BOOLEAN NOT NULL,
    "original_content" TEXT NOT NULL,
    "translated_content" TEXT,
    "format" "translation_task_type" NOT NULL,
    "translation_task_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_tasks" (
    "id" UUID NOT NULL,
    "language_pair_id" UUID NOT NULL,
    "editor_id" UUID,
    "original_content" TEXT NOT NULL,
    "format_type" "translation_task_type" NOT NULL,
    "original_structure" JSONB,
    "final_content" TEXT,
    "skip_editing" BOOLEAN NOT NULL,
    "status" "translation_task_statuses" NOT NULL,
    "current_stage" "translation_stages" NOT NULL,
    "error_message" TEXT,
    "editor_assigned_at" TIMESTAMP(3),
    "editor_completed_at" TIMESTAMP(3),
    "is_evaluation_task" BOOLEAN NOT NULL,
    "assigned_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_task_segments" (
    "id" UUID NOT NULL,
    "translation_task_id" UUID NOT NULL,
    "segment_order" INTEGER NOT NULL,
    "segment_type" "content_segment_types" NOT NULL,
    "source_content" TEXT NOT NULL,
    "anonymized_content" TEXT NOT NULL,
    "machine_translated_content" TEXT,
    "edited_content" TEXT,
    "special_tokens_map" JSONB,
    "format_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_task_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editor_applications" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "status" "editor_application_statuses" NOT NULL DEFAULT 'PENDING_REVIEW',
    "registration_token_hash" TEXT,
    "registration_token_is_used" BOOLEAN DEFAULT false,
    "editor_id" UUID,
    "rejectionReason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editor_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editor_application_language_pairs" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "language_pair_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editor_application_language_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_sets" (
    "id" UUID NOT NULL,
    "type" "evaluation_types" NOT NULL,
    "status" "evaluation_set_statuses" NOT NULL,
    "average_rating" DOUBLE PRECISION,
    "editor_id" UUID NOT NULL,
    "language_pair_id" UUID NOT NULL,
    "evaluator_id" UUID,
    "editor_language_pair_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_tasks" (
    "id" UUID NOT NULL,
    "rating" INTEGER,
    "senior_editor_feedback" TEXT,
    "translation_task_id" UUID NOT NULL,
    "evaluation_set_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensitive_data_mappings" (
    "id" UUID NOT NULL,
    "translation_task_id" UUID NOT NULL,
    "token_identifier" TEXT NOT NULL,
    "sensitive_type" TEXT NOT NULL,
    "original_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sensitive_data_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "editors_email_key" ON "editors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_email_key" ON "staff_members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "language_pairs_source_language_code_target_language_code_key" ON "language_pairs"("source_language_code", "target_language_code");

-- CreateIndex
CREATE UNIQUE INDEX "editor_language_pairs_editor_id_language_pair_id_key" ON "editor_language_pairs"("editor_id", "language_pair_id");

-- CreateIndex
CREATE UNIQUE INDEX "translations_translation_task_id_key" ON "translations"("translation_task_id");

-- CreateIndex
CREATE INDEX "translation_task_segments_translation_task_id_segment_order_idx" ON "translation_task_segments"("translation_task_id", "segment_order");

-- CreateIndex
CREATE UNIQUE INDEX "editor_applications_email_key" ON "editor_applications"("email");

-- CreateIndex
CREATE UNIQUE INDEX "editor_applications_registration_token_hash_key" ON "editor_applications"("registration_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "editor_applications_editor_id_key" ON "editor_applications"("editor_id");

-- CreateIndex
CREATE UNIQUE INDEX "editor_application_language_pairs_application_id_language_p_key" ON "editor_application_language_pairs"("application_id", "language_pair_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_sets_editor_language_pair_id_key" ON "evaluation_sets"("editor_language_pair_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_sets_editor_id_language_pair_id_created_at_key" ON "evaluation_sets"("editor_id", "language_pair_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_tasks_translation_task_id_key" ON "evaluation_tasks"("translation_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "sensitive_data_mappings_translation_task_id_token_identifie_key" ON "sensitive_data_mappings"("translation_task_id", "token_identifier");

-- AddForeignKey
ALTER TABLE "language_pairs" ADD CONSTRAINT "language_pairs_source_language_code_fkey" FOREIGN KEY ("source_language_code") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language_pairs" ADD CONSTRAINT "language_pairs_target_language_code_fkey" FOREIGN KEY ("target_language_code") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_language_pairs" ADD CONSTRAINT "editor_language_pairs_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "editors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_language_pairs" ADD CONSTRAINT "editor_language_pairs_language_pair_id_fkey" FOREIGN KEY ("language_pair_id") REFERENCES "language_pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_source_language_code_fkey" FOREIGN KEY ("source_language_code") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_target_language_code_fkey" FOREIGN KEY ("target_language_code") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_translation_task_id_fkey" FOREIGN KEY ("translation_task_id") REFERENCES "translation_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_language_pair_id_fkey" FOREIGN KEY ("language_pair_id") REFERENCES "language_pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "editors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_task_segments" ADD CONSTRAINT "translation_task_segments_translation_task_id_fkey" FOREIGN KEY ("translation_task_id") REFERENCES "translation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_applications" ADD CONSTRAINT "editor_applications_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "editors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_application_language_pairs" ADD CONSTRAINT "editor_application_language_pairs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "editor_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_application_language_pairs" ADD CONSTRAINT "editor_application_language_pairs_language_pair_id_fkey" FOREIGN KEY ("language_pair_id") REFERENCES "language_pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_sets" ADD CONSTRAINT "evaluation_sets_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "editors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_sets" ADD CONSTRAINT "evaluation_sets_language_pair_id_fkey" FOREIGN KEY ("language_pair_id") REFERENCES "language_pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_sets" ADD CONSTRAINT "evaluation_sets_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "editors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_sets" ADD CONSTRAINT "evaluation_sets_editor_language_pair_id_fkey" FOREIGN KEY ("editor_language_pair_id") REFERENCES "editor_language_pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_tasks" ADD CONSTRAINT "evaluation_tasks_translation_task_id_fkey" FOREIGN KEY ("translation_task_id") REFERENCES "translation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_tasks" ADD CONSTRAINT "evaluation_tasks_evaluation_set_id_fkey" FOREIGN KEY ("evaluation_set_id") REFERENCES "evaluation_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensitive_data_mappings" ADD CONSTRAINT "sensitive_data_mappings_translation_task_id_fkey" FOREIGN KEY ("translation_task_id") REFERENCES "translation_task_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

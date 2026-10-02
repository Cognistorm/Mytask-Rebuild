-- Appeal files (ROADMAP 4.1.6a, data-model §3.A `restriction_appeal_files`, spec 01 AC-47): which `appeal_file`
-- uploads belong to an appeal, in the user's order.
CREATE TABLE "restriction_appeal_files" (
    "appeal_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "restriction_appeal_files_pkey" PRIMARY KEY ("appeal_id", "file_id")
);

ALTER TABLE "restriction_appeal_files" ADD CONSTRAINT "restriction_appeal_files_appeal_id_fkey" FOREIGN KEY ("appeal_id") REFERENCES "restriction_appeals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "restriction_appeal_files" ADD CONSTRAINT "restriction_appeal_files_file_fk" FOREIGN KEY ("file_id") REFERENCES "files"("id");

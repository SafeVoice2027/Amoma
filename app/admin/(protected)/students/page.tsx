import { requireAdminOrHandler } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/ui";
import { ImportStudents } from "@/components/import-students";
import { importStudentBatch, previewStudentImport } from "./actions";
import { schoolForImporter } from "@/lib/students/school";

export default async function ImportStudentsPage() {
  const profile = await requireAdminOrHandler();
  const school = await schoolForImporter(createServiceClient(), profile);

  return (
    <div>
      <PageHeader
        title="Import students"
        subtitle={`Create student accounts from the school's SF1 files, and keep each student's grade and section up to date.${school ? ` Importing for ${school.name}.` : ""}`}
      />
      <ImportStudents
        storageKey={`amoma-import-history:${profile.id}`}
        actions={{ preview: previewStudentImport, runBatch: importStudentBatch }}
      />
    </div>
  );
}

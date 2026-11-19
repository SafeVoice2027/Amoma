import { requireAdminOrHandler } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/ui";
import { ImportStudents } from "@/components/import-students";
import { StudentsToCheck } from "@/components/students-to-check";
import { SwitchedOffStudents } from "@/components/switched-off-students";
import { listStudentsToCheck } from "@/lib/students/to-check";
import { listSwitchedOffStudents } from "@/lib/students/switched-off";
import {
  answerStudentsToCheck,
  importStudentBatch,
  previewStudentImport,
  switchOffOneStudent,
  switchOnStudent,
} from "./actions";
import { schoolForImporter } from "@/lib/students/school";

export default async function ImportStudentsPage() {
  const profile = await requireAdminOrHandler();
  const school = await schoolForImporter(createServiceClient(), profile);
  const toCheck = school ? await listStudentsToCheck(school.id) : { students: [], latestImportAt: null };

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
      <StudentsToCheck students={toCheck.students} latestImportAt={toCheck.latestImportAt} answer={answerStudentsToCheck} />
      <SwitchedOffStudents
        students={school ? await listSwitchedOffStudents(school.id) : []}
        switchOn={switchOnStudent}
        switchOffOne={switchOffOneStudent}
      />
    </div>
  );
}

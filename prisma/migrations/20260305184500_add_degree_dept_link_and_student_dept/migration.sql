-- Migration: add_degree_dept_link_and_student_dept
-- Adds degree_id (FK) to departments, updates unique constraint,
-- and adds optional department_id to students.

-- 1. Drop old unique INDEX on departments (was created via CREATE UNIQUE INDEX)
DROP INDEX IF EXISTS "departments_name_university_id_key";

-- 2. Add degree_id column to departments (NOT NULL — safe because table is empty)
ALTER TABLE "departments" ADD COLUMN "degree_id" TEXT NOT NULL;

-- 3. Add FK constraint: departments.degree_id → degrees.id
ALTER TABLE "departments" ADD CONSTRAINT "departments_degree_id_fkey"
    FOREIGN KEY ("degree_id") REFERENCES "degrees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Add new unique index (name + university + degree)
CREATE UNIQUE INDEX "departments_name_university_id_degree_id_key"
    ON "departments"("name", "university_id", "degree_id");

-- 5. Add optional department_id to students
ALTER TABLE "students" ADD COLUMN "department_id" TEXT;

-- 6. Add FK constraint: students.department_id → departments.id
ALTER TABLE "students" ADD CONSTRAINT "students_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

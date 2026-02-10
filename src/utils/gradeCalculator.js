/**
 * Grade Calculator Utility
 * Handles grade-to-point conversion and GPA calculations
 */

// Grade system mapping
const GRADE_POINTS = {
    'O': 10,
    'A+': 9,
    'A': 8,
    'B+': 7,
    'B': 6,
    'C': 5,
    'U': 0
};

/**
 * Convert letter grade to numeric grade point
 * @param {string} grade - Letter grade (O, A+, A, B+, B, C, U)
 * @returns {number} - Grade point value (0-10)
 */
export const getGradePoint = (grade) => {
    const normalizedGrade = grade?.toString().toUpperCase().trim();
    return GRADE_POINTS[normalizedGrade] ?? 0;
};

/**
 * Validate if a grade is valid
 * @param {string} grade - Grade to validate
 * @returns {boolean} - True if valid grade
 */
export const isValidGrade = (grade) => {
    const normalizedGrade = grade?.toString().toUpperCase().trim();
    return Object.keys(GRADE_POINTS).includes(normalizedGrade);
};

/**
 * Calculate CGPA (Cumulative Grade Points Average)
 * Formula: Σ(grade_point × credits) / Σ(credits)
 * @param {Array} courses - Array of course objects with grade and credits
 * @returns {number} - CGPA rounded to 2 decimal places
 */
export const calculateCGPA = (courses) => {
    if (!courses || courses.length === 0) return 0;

    let totalWeightedPoints = 0;
    let totalCredits = 0;

    courses.forEach(course => {
        const gradePoint = getGradePoint(course.grade);
        const credits = parseFloat(course.credits) || 0;

        totalWeightedPoints += gradePoint * credits;
        totalCredits += credits;
    });

    if (totalCredits === 0) return 0;

    const cgpa = totalWeightedPoints / totalCredits;
    return Math.round(cgpa * 100) / 100; // Round to 2 decimal places
};



/**
 * Get all available grades
 * @returns {Array} - Array of grade options
 */
export const getAvailableGrades = () => {
    return Object.keys(GRADE_POINTS);
};

/**
 * Get grade details (for display purposes)
 * @param {string} grade - Grade letter
 * @returns {Object} - Object with grade and point value
 */
export const getGradeDetails = (grade) => {
    return {
        grade: grade,
        point: getGradePoint(grade),
        isValid: isValidGrade(grade)
    };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import diyFrame from './passports/diy_frame.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import techReview from './passports/tech_review.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import movieReview from './passports/movie_review.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import cookingDinner from './passports/cooking_dinner.json'

export const demoPassports: Record<string, unknown> = {
  diy_frame: diyFrame,
  tech_review: techReview,
  movie_review: movieReview,
  cooking_dinner: cookingDinner,
}

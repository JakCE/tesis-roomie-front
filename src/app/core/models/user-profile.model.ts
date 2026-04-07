export interface UserProfile {
  $id:                string;
  $createdAt:         string;
  $updatedAt:         string;
  user_id:            string;
  display_name?:      string;
  gender:             'male' | 'female' | 'other';
  birth_date:         string;       // ← YYYY-MM-DD
  avatar_url:         string;
  occupation:         'student' | 'employed' | 'freelancer' | 'other';
  budget_min:         number;
  budget_max:         number;
  preferred_zone:     string;
  preferred_lat:      number;
  preferred_lng:      number;
  search_radius_km:   number;
  schedule:           'morning' | 'night' | 'flexible';
  cleanliness_level:  number;
  noise_tolerance:    number;
  has_pets:           boolean;
  accepts_pets:       boolean;
  smokes:             boolean;
  accepts_smokers:    boolean;
  has_car:            boolean;
  age_range_min:      number;
  age_range_max:      number;
  gender_preference:  'male' | 'female' | 'any';
  bio:                string;
  embedding_vector:   string;
  is_visible:         boolean;
}

export interface UserPreferenceWeights {
  $id:          string;
  user_id:      string;
  w_budget:     number;
  w_zone:       number;
  w_schedule:   number;
  w_cleanliness:number;
  w_noise:      number;
  w_pets:       number;
  w_smoking:    number;
  w_age:        number;
  w_gender:     number;
  alpha:        number;
}
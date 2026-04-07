export interface Match {
  $id:                 string;
  $createdAt:          string;
  user_a_id:           string;
  user_b_id:           string;
  compatibility_score: number;
  status:              'active' | 'blocked' | 'deleted';
}

export interface Message {
  $id:        string;
  $createdAt: string;
  match_id:   string;
  sender_id:  string;
  content:    string;
  type:       'text' | 'system';
  is_read:    boolean;
}

export interface Interaction {
  $id:           string;
  $createdAt:    string;
  from_user_id:  string;
  to_user_id:    string;
  action:        'like' | 'dislike' | 'skip';
  content_score: number;
  collab_score:  number;
  hybrid_score:  number;
}
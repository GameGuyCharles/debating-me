-- Migration 005: Seed topic categories

INSERT INTO topic_categories (name, slug, description, icon, display_order) VALUES
    ('Politics', 'politics', 'Government policy, elections, and political philosophy', '🏛️', 1),
    ('Science', 'science', 'Scientific discoveries, theories, and research', '🔬', 2),
    ('Technology', 'technology', 'Software, hardware, AI, and digital innovation', '💻', 3),
    ('Philosophy', 'philosophy', 'Ethics, logic, metaphysics, and philosophical thought', '🤔', 4),
    ('Economics', 'economics', 'Markets, fiscal policy, trade, and economic systems', '📈', 5),
    ('Society & Culture', 'society-culture', 'Social issues, cultural topics, and lifestyle', '🌍', 6),
    ('Sports', 'sports', 'Athletic competition, teams, records, and sports culture', '⚽', 7),
    ('Education', 'education', 'Schools, learning methods, curriculum, and academic topics', '📚', 8),
    ('Environment', 'environment', 'Climate, conservation, energy, and sustainability', '🌱', 9),
    ('Health', 'health', 'Medicine, wellness, public health, and healthcare policy', '🏥', 10),
    ('History', 'history', 'Historical events, figures, and interpretations', '📜', 11),
    ('Entertainment', 'entertainment', 'Movies, music, games, and media', '🎬', 12),
    ('Law & Justice', 'law-justice', 'Legal systems, court cases, and criminal justice', '⚖️', 13),
    ('Religion', 'religion', 'Faith, theology, and religious practice', '🕊️', 14),
    ('Other', 'other', 'Topics that do not fit other categories', '💬', 99);

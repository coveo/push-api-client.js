const batmanCloner = (id: number) => ({
  DocumentId: `https://www.themoviedb.org/movie/${id}`,
  data: 'Batman (1989) \n Based on the Character created by Bob Kane. \n EXT. CITYSCAPE - NIGHT \n Gotham City.  The City of Tomorrow:  stark angles, creeping shadows, dense, crowded, as if hell had erupted through the sidewalks.  A dangling fat moon shines overhead. \n At the opposite corner of the roof, some fifteen yards away... at the end of a line, a STRANGE BLACK SILHOUETTE is dropping slowly, implacably, into frame...',
  fileExtension: '.txt',
  title: 'Batman',
  year: 1989,
  date: '1989-06-13T12:00:00.000Z',
  summary:
    "The Dark Knight of Gotham City begins his war on crime with his first major enemy being the clownishly homicidal Joker, who has seized control of Gotham's underworld.",
  tagline: 'Have you ever danced with the devil in the pale moonlight?',
  actors: ['Jack Nicholson', 'Michael Keaton', 'Kim Basinger'],
  poster:
    '//image.tmdb.org/t/p/w185_and_h278_bestv2/kBf3g9crrADGMc2AMAMlLBgSm2h.jpg',
});

export const generateBatmans = (batmanCount: number) => {
  return Array(batmanCount)
    .fill(null)
    .map((_, idx) => batmanCloner(idx));
};

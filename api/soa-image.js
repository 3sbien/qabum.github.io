const SOURCES = {
  b1:'/seeds-of-anarchy/assets/genetics/bullshit-01.jpg',
  b2:'/seeds-of-anarchy/assets/genetics/bullshit-02.jpg',
  b3:'/seeds-of-anarchy/assets/genetics/bullshit-03.jpg',
  b4:'/seeds-of-anarchy/assets/genetics/bullshit-04.jpg',
  b5:'/seeds-of-anarchy/assets/genetics/bullshit-05.jpg',
  b6:'/seeds-of-anarchy/assets/genetics/bullshit-06.jpg',
  c1:'/seeds-of-anarchy/assets/genetics/cabin-fever-01.jpg',
  c2:'/seeds-of-anarchy/assets/genetics/cabin-fever-02.jpg',
  c3:'/seeds-of-anarchy/assets/genetics/cabin-fever-03.jpg',
  c4:'/seeds-of-anarchy/assets/genetics/cabin-fever-04.jpg',
  c5:'/seeds-of-anarchy/assets/genetics/cabin-fever-05.jpg',
  d1:'/seeds-of-anarchy/assets/genetics/dancing-sprite-01.jpg',
  d2:'/seeds-of-anarchy/assets/genetics/dancing-sprite-02.jpg',
  d3:'/seeds-of-anarchy/assets/genetics/dancing-sprite-03.jpg',
  d4:'/seeds-of-anarchy/assets/genetics/dancing-sprite-04.jpg',
  d5:'/seeds-of-anarchy/assets/genetics/dancing-sprite-05.jpg',
  go1:'/seeds-of-anarchy/assets/genetics/gorgon-01.jpg',
  go2:'/seeds-of-anarchy/assets/genetics/gorgon-02.jpg',
  go3:'/seeds-of-anarchy/assets/genetics/gorgon-03.jpg',
  go4:'/seeds-of-anarchy/assets/genetics/gorgon-04.jpg',
  go5:'/seeds-of-anarchy/assets/genetics/gorgon-05.jpg',
  gu1:'/seeds-of-anarchy/assets/genetics/gunk-01.jpg',
  gu2:'/seeds-of-anarchy/assets/genetics/gunk-02.jpg',
  n1:'/seeds-of-anarchy/assets/genetics/naughty-dawg-01.jpg',
  n2:'/seeds-of-anarchy/assets/genetics/naughty-dawg-02.jpg',
  n3:'/seeds-of-anarchy/assets/genetics/naughty-dawg-03.jpg',
  n4:'/seeds-of-anarchy/assets/genetics/naughty-dawg-04.jpg',
  n5:'/seeds-of-anarchy/assets/genetics/naughty-dawg-05.jpg',
  n6:'/seeds-of-anarchy/assets/genetics/naughty-dawg-06.jpg',
  s1:'/seeds-of-anarchy/assets/genetics/slurpicle-01.jpg',
  s2:'/seeds-of-anarchy/assets/genetics/slurpicle-02.jpg',
  s3:'/seeds-of-anarchy/assets/genetics/slurpicle-03.jpg',
  s4:'/seeds-of-anarchy/assets/genetics/slurpicle-04.jpg',
  s5:'/seeds-of-anarchy/assets/genetics/slurpicle-05.jpg',
  s6:'/seeds-of-anarchy/assets/genetics/slurpicle-06.jpg',
  sp1:'/seeds-of-anarchy/assets/genetics/spritzade-01.jpg',
  sp2:'/seeds-of-anarchy/assets/genetics/spritzade-02.jpg',
  sp3:'/seeds-of-anarchy/assets/genetics/spritzade-03.jpg',
  sp4:'/seeds-of-anarchy/assets/genetics/spritzade-04.jpg',
  sp5:'/seeds-of-anarchy/assets/genetics/spritzade-05.jpg',
  sp6:'/seeds-of-anarchy/assets/genetics/spritzade-05.jpg'
};

export default function handler(req, res) {
  const id = String(req.query?.id || '');
  const url = SOURCES[id];
  if (!url) return res.status(404).send('Image not found');
  res.setHeader('Cache-Control','public, max-age=300, s-maxage=3600');
  return res.redirect(302, url);
}

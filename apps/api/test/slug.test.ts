// slugify = legacy Laravel Str::slug (ADR-006 §8); expectations are live mytask.ge slugs.
import { describe, expect, it } from 'vitest';
import { slugify } from '../src/platform/slug';

describe('slugify', () => {
  it.each([
    ['პროდუქტის სარეკლამო ვიზუალების შექმნა', 'produqtis-sareklamo-vizualebis-sheqmna'],
    ['ვებ საიტის აწყობა', 'veb-saitis-atsyoba'],
    ['დაზიანებული ფოტოების აღდგენა', 'dazianebuli-fotoebis-aghdgena'],
    ['სარეკლამო ვიდეოების მონტაჟი', 'sareklamo-videoebis-montazhi'],
    ['მომხმარებელთა მხარდაჭერის', 'momkhmarebelta-mkhardacheris'],
    ['პროგრამული უზრუნველყოფის', 'programuli-uzrunvelyofis'],
    ['ძალა ჯადო ჰო ჩაი', 'dzala-jado-ho-chai'],
    ['ბრენდინგი/ლოგოს დიზაინი', 'brendingilogos-dizaini'],
    ['Python-ით და Flask-ით', 'python-it-da-flask-it'],
    ['Full Stack  Developer', 'full-stack-developer'],
    ['UI_UX design', 'ui-ux-design'],
    ['Café Crème', 'cafe-creme'],
    ['  --Logo--  ', 'logo'],
    ['ᲚᲝᲒᲝ', 'logo'],
    ['😀', ''],
  ])('%s → %s', (input, slug) => {
    expect(slugify(input)).toBe(slug);
  });
});

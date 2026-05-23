import schoolImage from '@/assets/images/school.png'
import studentUseLaptopImage from '@/assets/images/student-use-lap.png'
import teacherUseLaptopImage from '@/assets/images/teacher-use-lap.png'
import { audienceItems } from '../../data/landingContent'
import type { AudienceImage } from '../../data/landingContent'
import { Container, IconBadge, SectionHeading } from './landingShared'

const audienceImages: Record<AudienceImage, string> = {
  school: schoolImage,
  student: studentUseLaptopImage,
  teacher: teacherUseLaptopImage,
}

export function AudienceSection() {
  return (
    <section className="bg-white py-7 sm:py-16" id="audiences">
      <Container>
        <SectionHeading title="Dành cho ai?" />
        <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-8 sm:grid-cols-1 sm:gap-5 lg:grid-cols-3">
          {audienceItems.map((item, index) => (
            <article
              className={`relative min-h-41 min-w-0 overflow-hidden rounded-2xl border border-slate-200 p-3 shadow-lg shadow-slate-200/70 sm:rounded-3xl sm:p-5 ${
                index === 0
                  ? 'bg-indigo-50'
                  : index === 1
                    ? 'bg-sky-50'
                    : 'bg-emerald-50'
              }`}
              key={item.title}
            >
              <div className="grid gap-3 sm:min-h-65 sm:gap-4 sm:grid-cols-[1fr_150px]">
                <div className="relative z-10 max-w-[72%] sm:max-w-none">
                  <div className="mb-2 flex items-center gap-1.5 sm:mb-4 sm:gap-3">
                    <IconBadge
                      className="size-7 rounded-xl bg-white/80 sm:size-11 sm:rounded-2xl"
                      icon={
                        item.image === 'school'
                          ? 'school'
                          : item.image === 'teacher'
                            ? 'users'
                            : 'graduation'
                      }
                    />
                    <h3 className="text-xs font-bold leading-4 text-slate-950 sm:text-lg">
                      {item.title}
                    </h3>
                  </div>
                  <ul className="grid gap-1 text-[11px] font-medium leading-4 text-slate-800 sm:hidden">
                    {(item.mobileBullets ?? item.bullets.slice(0, 2)).map((bullet) => (
                      <li className="flex gap-1.5" key={bullet}>
                        <span
                          className={`mt-1.5 size-1 shrink-0 rounded-full ${
                            index === 0
                              ? 'bg-indigo-500'
                              : index === 1
                                ? 'bg-sky-500'
                                : 'bg-emerald-500'
                          }`}
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="hidden gap-2 text-sm leading-6 text-slate-700 sm:grid">
                    {item.bullets.map((bullet) => (
                      <li className="flex gap-2" key={bullet}>
                        <span
                          className={`mt-2 size-1.5 shrink-0 rounded-full ${
                            index === 0
                              ? 'bg-indigo-500'
                              : index === 1
                                ? 'bg-sky-500'
                                : 'bg-emerald-500'
                          }`}
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pointer-events-none absolute bottom-0 right-0 z-0 h-[58%] w-[58%] sm:hidden">
                  <img
                    alt={`${item.title} sử dụng vox`}
                    className={`h-full w-full ${
                      item.image === 'school'
                        ? 'object-cover object-right'
                        : 'object-contain object-bottom'
                    }`}
                    src={audienceImages[item.image]}
                  />
                </div>
                <div className="hidden items-end justify-end sm:flex">
                  <img
                    alt={`${item.title} sử dụng vox`}
                    className="max-h-48 w-full max-w-44 object-contain sm:max-h-56"
                    src={audienceImages[item.image]}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

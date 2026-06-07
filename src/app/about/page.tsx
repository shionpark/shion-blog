import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "박서영(Shion)에 대해 소개합니다.",
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-8">About</h1>

      <div className="prose">
        <p>
          안녕하세요, 박서영입니다.
        </p>
        <p>
          데이터 분석가로서 흩어진 정보를 구조화하고, 프론트엔드 개발자로서
          사용자 경험으로 구현해 왔습니다. 현재는 프론트엔드와 백엔드를
          아우르는 풀스택 개발자로서, 데이터가 수집되고 가공되어 사용자에게
          전달되기까지의 흐름 전체를 설계하고 구현하는 데 집중하고 있습니다.
        </p>
        <p>
          AI를 활용한 콘텐츠 자동 생성, 운영 자동화 등 반복 업무를 시스템으로
          전환하는 작업에 관심이 많습니다.
        </p>

        <h2>기술 스택</h2>
        <ul>
          <li><strong>Frontend</strong> — React, Next.js (App Router), Tailwind CSS</li>
          <li><strong>Backend</strong> — NestJS, Prisma ORM, PostgreSQL, Redis</li>
          <li><strong>AI / 자동화</strong> — Anthropic Claude API, NestJS Scheduler</li>
          <li><strong>분석</strong> — GA4, Mixpanel, Meta Ads API</li>
        </ul>

        <h2>경력</h2>
        <ul>
          <li><strong>인톡</strong> — 풀스택 개발자 (2026.03 ~ 현재)</li>
          <li><strong>비더라이트 컴퍼니</strong> — 프론트엔드 엔지니어 (2023.12 ~ 2025.04)</li>
          <li><strong>미리디</strong> — 데이터 분석가 (2022.05 ~ 2022.08)</li>
          <li><strong>빅스인텔리전스</strong> — 기획 및 분석 (2020.12 ~ 2022.04)</li>
        </ul>

        <h2>연락처</h2>
        <ul>
          <li>
            <strong>GitHub</strong> —{" "}
            <a href="https://github.com/shionpark" target="_blank" rel="noopener noreferrer">
              github.com/shionpark
            </a>
          </li>
          <li>
            <strong>Email</strong> —{" "}
            <a href="mailto:seoy1108@gmail.com">seoy1108@gmail.com</a>
          </li>
        </ul>
      </div>
    </div>
  );
}

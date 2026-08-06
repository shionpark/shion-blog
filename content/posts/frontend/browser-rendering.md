---
title: "주소창에 URL을 입력하면 브라우저에서 어떤 일이 벌어질까?"
description: "URL 입력부터 DNS 조회, TCP 연결, HTTP 요청, 브라우저 렌더링까지 페이지가 화면에 그려지는 전 과정을 정리합니다."
date: "2025-07-04"
tags: []
published: true
---

# 용어 정리의 필요성

우리가 너무 익숙해져 사용하고 있는, 당연하게 여기는 용어가 사실은 당연하지 않을 수 있다!

[이 영상](https://www.youtube.com/watch?v=o4MwTvtyrUQ)은 “What is browser?”라는 질문에 대답하지 못하는 일반인의 모습이 나온다. 16년 전 영상이지만, 오늘날에도 당연하게 사용하고 있는 용어의 구체적인 원리를 질문했을 때 과연 정확한 답변이 나올까?

이는 나 스스로에게 갖는 의구심이기도 하다. 개발자인 나 조차도 용어의 정확한 정의나 맥락을 이해하지 못한 채 사용하는 경우가 종종 있다.

> *예를 들어 이런 용어들이 있다.
> ”****렌더링, DOM, API, 모듈, 컴포넌트, 상태, 비동기 처리, CSR/SSR, SPA/MPA, 빌드/번들링/트랜스파일링, 캐시, HTTP/HTTPS/REST, OOP/FP***** … “**

그래서 이 글에서는, 자주 쓰면서도 명확하게 이해하지 못하는 프론트엔드 용어들을 정리하고자 한다. 단순한 정의만 나열하기보다, 실제 맥락에서 어떻게 쓰이는지, 왜 혼동하기 쉬운지까지 짚어보려 한다.

# 1. 브라우저

브라우저는 ①HTML, CSS, JS를 ②렌더링해 웹페이지를 보여주는 애플리케이션이다. 대표적인 브라우저는 Chrome, Microsoft Edge, Safari, Firefox 등이 있다.

![HTML vs. CSS vs. JS](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/4616486e-6082-401a-a8de-576a87cf9bab/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB4663FAKLVOG%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152853Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF8aCXVzLXdlc3QtMiJHMEUCIAmOTVANZWvs%2Fuf4908vNrGrUEFgKRX1se5OB%2BkV9JeHAiEAlvbzekBGtkRREIwF0xyMweyM3wVOucCzGPxK%2F9gt6YAq%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDJcsSakk%2Bp9QmCCTkyrcAz8S0g4P4%2BDvdgpUQ6CChJ6vW5zCo1aVxXzZOR759z%2FrKOapQ%2Bxa0IrXl9ntXjfegI9r8heWFIJuP32j%2FiB8UdLuT9H1%2BwYtsKEsZ8%2FbDs7nfM4ll4YE6ZHVtYJzNZtzu5NszmMgOm4NLqERcWgTezRyPCQQ6Vc13VOsap14NOE1LtKrjz3DQ6x%2BO05YbYxYMbwgU5KRtHuWcdWChW3zlwwemHJK1W9Z36XCxSZ88uIkDFSHpNHPvxrN775pQadQbiseqJR0w1j5pGNJzG%2F3uvuYbk7CFsARKwFf21ki4ir%2Fefn%2BddQo2rbPU%2BtiN7QqBXgc%2Bp1lyXkib7DMazqXi7ppEhJGWzVLrzj0uY6Lcx5YmBxisqu8TIiQtTEaArXi9v4l9AfRzgXo9jFiqEKtkx5SDjNXELfafkhl3sBWLUSMxBKLBvRAQ81DdMyWfiB2kZCpQHTSWfc7T7o1zY7HMqq5V8xQTUUI4BMER7lsWitxZUE6yCylxSxtszGi7PmI3AorLqRCSzC0HEyE3trUGfTrgxrCUFHJ6fp2KClAy1YnMY5ShtlQb%2FwBS92d1JU6adnetuqBRtytmhb1h4jRsSxNhG7zlA1NxGai2M7x%2FeazcGDXuzlcT6VJfc0aMKKMzdMGOqUBcmJUcLG%2BqkmcRbOI6%2FN7DKAticjH6LiK5ANGdjhUeVk2OyABtN7UlzZztcsJaFILkJY%2FhDhWu0l%2BFymVESF2%2BENfPXTXWVI5puR3ZdhEPrLwsK7fVc%2BSD93uLtwvj5ioe5XnCFPbBBYVy6GI3ToYqwkhmHUIHFFAPATMnJ%2FH101bZr9JwGVwz75M%2BTT6SaHHBtnFYEvwnV2osl9kDyAaQVnYWeZQ&X-Amz-Signature=36e4de8feb8a1f728410ae63d5a3349eeba645a558b312d03caf76d59f7d6387&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

①HTML, CSS, JS 이 3개를 비교하는 그림이다. 
HTML은 뼈대, CSS는 피부, JS는 뇌라고 표현한다.

HTML은 문서 요소를 구조화 해놓은 것이고, 
CSS는 스타일을, JS는 동적인 요소를 작동하기 위한 소스코드이다. 



②렌더링은 코드를 화면에 그리는 과정이다. 

각 브라우저마다 렌더링 엔진이 있어 HTML 파일을 받아 브라우저 화면에 그려낸다. 

프론트엔드 개발자로서 구체적으로 이해해야 하는 내용은, **브라우저의 렌더링 엔진이 HTML 파일을 받기까지의 과정**과, 받은 이후에 **어떤 처리를 거쳐 화면에 그려내는지** 에 대한 내용이다!



![브라우저의 렌더링 엔진](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/65cd1a54-8d60-4d55-8ded-c02d5335fb1b/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466TK4K3JRG%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152854Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJHMEUCIGEDMESbmrABoFpZBEBQx%2BSiYlj%2BMJ3huWeZvPgVQYbBAiEAtcFoYVQDB5n4Zi6EFQEqBoTOvi9uuTyfRlGHrQkMZxoq%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDJ%2BgnEuAtU%2Fl3StalSrcA60o36KeNJn1k7zLOyaa3%2B5rGCdmm2dMtWswK2kcW521ombsHjneVmyXVD9TuAfKlJ3mmRuiWUZ2ZPr7D0DXGuXavu7K8eynt3OGf2Mqpxn%2BpqvRXSKaau9rp%2FUHHV%2BPtEu%2BXLzk5OqICbT9HVxA%2FiM5eloGp%2F1lkCcxoEAAKM0QDHN4chwPurHzgwSB957gFkO5gtKcVgm47nuwM9w4YR79x2PnMwnljnBbG9HTUePf%2FVq%2BL4OuFUSVOy5A8JvmqaHZhMfAL%2Be%2BRyzzy2yq51JLt%2Fgs1GRbCGporUmQgvvhckalR9PWv95rz05be7P8O%2B710BCNgf9smPldSscL%2FDeFsYvfz58GqIigiU4i3Qvc6x8ezWkI%2FmZzigof1cAUiDNKQP5ooPJe2Z6Xb0HKiW8JTfnI8Nv4sat45uhpEmxj3O27fKssXkC8gfpRQgd67VuTMzN48ClwR9JDIGNJuR8OUHgDlQBpUU5%2FSsa6r4YKfTow04etmbpr0P4LZO7ZYQrhMnFAzNU%2BpqPuzE5jC%2FmLjYedIhNRL0D2gVLbJfS%2BjwiLD%2F5RuIoqqnMuuVnkI58LfS10zB5cd7WsLNdWUwRANBh4m5eXcW7h8L4zIMHW9awUvovxu%2Fbq7%2BQCMOWKzdMGOqUBvH2GCD890OvHXaGowitCW7%2B70TbQrwLIfti34shE9oJVOZO3YYbL5CYnv3aRNI91VZEQ%2B49g1IeyCqZdJf1M8q%2BcRfnt962T3UEK%2BK37x0X9h6WP1jw7YHvF96ORHzWZpzGRqfRXl2yMpda9jeO32X4yXs1%2FaGweQwPUF2jZBFxcXvuLz5%2FloCEwZ%2FaBWNSYi0lKozXPQQkQQLEqhkBnGKuWpW0Q&X-Amz-Signature=f23b6bd6f74760e4c36b842b48f5a8ecb6cde94fc140891241652aff560063d8&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

## Performance Timing API로 보는 페이지 로딩 과정

요청된 페이지의 로딩 성능을 측정하는 JavaScript API인 **Performance Timing(성능 타이밍) API**는 더 이상 지원되지 않지만 모든 브라우저에서 지원된다. 즉, 사용할 수는 없지만 브라우저 자체적으로 포함하고 있다.

**Performance Timing API**는 페이지 로딩 프로세스의 각 지점에 도달한 시간을 밀리초(ms) 단위로 나타내는 읽기 전용 시간을 제공한다. 아래 이미지에서 구체적인 **페이지 로딩 과정**을 알 수 있다.

![](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/0b95a0be-ffec-49a0-9063-00c06b1981d7/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB4666DAI755X%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152852Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJHMEUCIGjKKsxBiMghwcjMipsGlkPb9hbPW7T2NuIO7YysLI8vAiEAhBkvTRYLnJ224Ee18V9PMcqluuo8Pr3pnFhOos0I3TAq%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDDpkaenQ6vaWXkOJQCrcA64s6APka8etBYS7H0OJZmXGQYhAxbB6rsTFEZW1Na9iI9UelcXneYDsFtjtA6s7ijhwjqoLI8Ip42NYKpRWwhLhosUZKd1u1kpZVt7JH3GivCB0I671lZljQ0RoBl1qOk0rIsZanLW864vRaeAxcbIOcnCwCsgTa8j%2BRh3ralY4191A%2FKQNKVGivAtFbFGRmXdei9khws5QHdkIK542jZNFHXEcNQUOmv3yVwBBFhAY7dCDQc24wVloQ3lJCJJE2h2559Nqap%2Fbpe5YXqYsCtKA9RdQeHsAafMoGNuMi3uEZhfUwOdyOZxHGdcUYA3Zby%2BZFHK%2FrQsv8ztHfDEdHOQU3IIiqS7Og0GaTt6V6PGt9RT43Dmj1VoKOR7PBZuAVE%2BsrJKuEB8gpcZ56dtFAHpT%2FmKWRtaCUUSmWyn41qo%2BroT4bpQMwSJEsBiphl1kkLKgwWgVAaGqZ8OHmSPwVcNaTcx1QxrkIQ8TTkYmVixYjE4HyZtHm6ofbIfXuK3hNNYJ4sDOFIk6j9KqtRM0DlbI%2FsvMNpUq4owyQI2HXjpS5hPLHYoCsngM5iScJ1W%2BVnfG38gfCIatW%2F5JSIT1im97XkL1f8hJ8XDmS61PtqFkUWwvcI%2B40H8ZSIllMLqLzdMGOqUBbInMsD019NYJdooL5ghnUYuzfkK3Gb9fQuJiK1OIv2NbK5xkabu%2FCW9JyaSdi55rM4ahRqrBraBc%2FhC2Yrkdo17p9t1hYqIjn8A96LfnlRyPlXAfLSLkT0zpRMiQRK1WEUY%2BLwv4NYASWYLMJRSiRWLbZ9OEvkUNX3ja0zueDfY%2FiOwIiwPG3LIclWX7bnFSWovUxgukqz5Pe2RSqDK%2FuLQ%2BAxhs&X-Amz-Signature=11c323a37436b508925ff7ffe44b0f697f013b2ea80ac5229d08c46ec7bc50a7&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

### Prompt for unload



### DNS 조회

사용자가 주소창에 URL을 입력하면 해당 URL 주소를 DNS(Domain Name System)에서 조회하여 IP(Internet Protocol) 주소를 획득한다. URL은 구조화 된 주소, IP 주소는 실제 주소를 의미한다.

![[DNS 조회 과정](https://www.devkuma.com/docs/dns/)](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/a01b1f44-84b5-4f36-8193-c7a8fe063457/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB4666DAI755X%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152852Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJHMEUCIGjKKsxBiMghwcjMipsGlkPb9hbPW7T2NuIO7YysLI8vAiEAhBkvTRYLnJ224Ee18V9PMcqluuo8Pr3pnFhOos0I3TAq%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDDpkaenQ6vaWXkOJQCrcA64s6APka8etBYS7H0OJZmXGQYhAxbB6rsTFEZW1Na9iI9UelcXneYDsFtjtA6s7ijhwjqoLI8Ip42NYKpRWwhLhosUZKd1u1kpZVt7JH3GivCB0I671lZljQ0RoBl1qOk0rIsZanLW864vRaeAxcbIOcnCwCsgTa8j%2BRh3ralY4191A%2FKQNKVGivAtFbFGRmXdei9khws5QHdkIK542jZNFHXEcNQUOmv3yVwBBFhAY7dCDQc24wVloQ3lJCJJE2h2559Nqap%2Fbpe5YXqYsCtKA9RdQeHsAafMoGNuMi3uEZhfUwOdyOZxHGdcUYA3Zby%2BZFHK%2FrQsv8ztHfDEdHOQU3IIiqS7Og0GaTt6V6PGt9RT43Dmj1VoKOR7PBZuAVE%2BsrJKuEB8gpcZ56dtFAHpT%2FmKWRtaCUUSmWyn41qo%2BroT4bpQMwSJEsBiphl1kkLKgwWgVAaGqZ8OHmSPwVcNaTcx1QxrkIQ8TTkYmVixYjE4HyZtHm6ofbIfXuK3hNNYJ4sDOFIk6j9KqtRM0DlbI%2FsvMNpUq4owyQI2HXjpS5hPLHYoCsngM5iScJ1W%2BVnfG38gfCIatW%2F5JSIT1im97XkL1f8hJ8XDmS61PtqFkUWwvcI%2B40H8ZSIllMLqLzdMGOqUBbInMsD019NYJdooL5ghnUYuzfkK3Gb9fQuJiK1OIv2NbK5xkabu%2FCW9JyaSdi55rM4ahRqrBraBc%2FhC2Yrkdo17p9t1hYqIjn8A96LfnlRyPlXAfLSLkT0zpRMiQRK1WEUY%2BLwv4NYASWYLMJRSiRWLbZ9OEvkUNX3ja0zueDfY%2FiOwIiwPG3LIclWX7bnFSWovUxgukqz5Pe2RSqDK%2FuLQ%2BAxhs&X-Amz-Signature=a343c1a0f42bc070202c5b64c54ce46bb74bc38d70199412d2787db0466aa516&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

![[URL 구조](https://www.geeksforgeeks.org/javascript/what-is-url-uniform-resource-locator/)](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/c77b9321-573f-4e24-b6de-d8e96a432305/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB4666DAI755X%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152852Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJHMEUCIGjKKsxBiMghwcjMipsGlkPb9hbPW7T2NuIO7YysLI8vAiEAhBkvTRYLnJ224Ee18V9PMcqluuo8Pr3pnFhOos0I3TAq%2FwMIJxAAGgw2Mzc0MjMxODM4MDUiDDpkaenQ6vaWXkOJQCrcA64s6APka8etBYS7H0OJZmXGQYhAxbB6rsTFEZW1Na9iI9UelcXneYDsFtjtA6s7ijhwjqoLI8Ip42NYKpRWwhLhosUZKd1u1kpZVt7JH3GivCB0I671lZljQ0RoBl1qOk0rIsZanLW864vRaeAxcbIOcnCwCsgTa8j%2BRh3ralY4191A%2FKQNKVGivAtFbFGRmXdei9khws5QHdkIK542jZNFHXEcNQUOmv3yVwBBFhAY7dCDQc24wVloQ3lJCJJE2h2559Nqap%2Fbpe5YXqYsCtKA9RdQeHsAafMoGNuMi3uEZhfUwOdyOZxHGdcUYA3Zby%2BZFHK%2FrQsv8ztHfDEdHOQU3IIiqS7Og0GaTt6V6PGt9RT43Dmj1VoKOR7PBZuAVE%2BsrJKuEB8gpcZ56dtFAHpT%2FmKWRtaCUUSmWyn41qo%2BroT4bpQMwSJEsBiphl1kkLKgwWgVAaGqZ8OHmSPwVcNaTcx1QxrkIQ8TTkYmVixYjE4HyZtHm6ofbIfXuK3hNNYJ4sDOFIk6j9KqtRM0DlbI%2FsvMNpUq4owyQI2HXjpS5hPLHYoCsngM5iScJ1W%2BVnfG38gfCIatW%2F5JSIT1im97XkL1f8hJ8XDmS61PtqFkUWwvcI%2B40H8ZSIllMLqLzdMGOqUBbInMsD019NYJdooL5ghnUYuzfkK3Gb9fQuJiK1OIv2NbK5xkabu%2FCW9JyaSdi55rM4ahRqrBraBc%2FhC2Yrkdo17p9t1hYqIjn8A96LfnlRyPlXAfLSLkT0zpRMiQRK1WEUY%2BLwv4NYASWYLMJRSiRWLbZ9OEvkUNX3ja0zueDfY%2FiOwIiwPG3LIclWX7bnFSWovUxgukqz5Pe2RSqDK%2FuLQ%2BAxhs&X-Amz-Signature=0349dbc488c486486a7ae98f5dd5b2740a929777b3b993a33ead3c73596f9b1a&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

### TCP 연결

DNS 조회 이후에 브라우저는 IP 주소를 알아내고 TCP(Transmission Control Protocol) 연결을 맺어서 서버와 통신을 하게 되는데, 여기서 SSL을 사용하는 경우 TLS HandShake가 이루어진다. 간단히 말하면 보안 연결을 위해 서버와 브라우저가 암호화 통신을 설정하는 과정이다. 

### HTTP 요청

서버 연결 후 서버에 HTTP 요청을 보내고 해당 URL에 대한 HTML 파일을 응답받는다. 

여기서 서버란, 이해하기 쉽게 예시를 들자면 최근 카카오 데이터 센터에서 불이 났다는 소식을 들었지 않는가? 이 실체, ‘데이터 센터’가 서버의 역할을 한다. 웹 애플리케이션을 운영하는 기업은 서버에 데이터를 저장해두고 요청이 들어올 때마다 응답해주는 방식이다. 만약 구글 웹사이트에 접속한다면 구글 서버에 데이터를 달라는 HTTP 요청을 보낸 후 응답받은 결과를 브라우저가 렌더링 한 결과로 브라우저 화면이 보여지는 것.

![데이터 센터](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/649baad4-e738-4eec-833a-a7b76534e6f7/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB4662QQAN6X3%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152854Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJIMEYCIQDn2E3feKjvXHfGA7g0XcoLILldLWueihZtHtIAQtgyagIhALggBFMgaPmw3evKZUIxILTHcIP1IfrqwMy0e6xFTDu2Kv8DCCcQABoMNjM3NDIzMTgzODA1IgwAwxZbUDAVdOEx1%2BMq3AOHtwry%2FxovwBI3Gx3H%2FXfyQKG6nVifALVXxMgrX1Xw1qtaNo%2F7sf0SypWkMmmI6I%2FwQ4xfPMKhavz5rKU9aY5gzdfX22lveEHFin396p6g06fDV8mkjV7Chpcp%2BdEntWPFwiLd%2FzYLBbie3hpZtGy48sHZj%2FPcasvdExdr8%2Fb1RgEFtYZvP7isrs%2F5TbN37374F1LvVKI2sRAE3y6P4FDJkPAEkoolCQ4u3lG2r6mA1ZxXsfy6yTdTk6CmnR9DKdIiMs7bgnyZXvRV3Kl%2B%2Fm9NryZ6oNpB9%2FGMM1Ov%2FlhFNtDhsLJoIzdSMtX0EvSnvZPOy6QPnxkeuZpO4J51caRFCQZsV340GVEXgSsgeEpKlHxNVJEUg31hwHqPUGXwcx2gv8q6MU%2B3BoLu4zHMCyFeS9p7obUtKiBtSp78618zFxkRr5gV7lqorrT%2FhXAMy8hoeNEr7fp%2BY6SorSCggUekDjGmfzAgRpcBLYF5gI9Su2KzL9baTFILWO5d7KT0pdV34PPTH4NvNKJbBAhIBVUcDbUPfevC7FusLCaKEAglzaEsTw3YSSC%2BvDnmmJTiqgWNIWYSLzK0VnJYZBW9jNzeMv2BNhAEdog5mnC5yDgAjFGot7zLTarm8S0cDDCVi83TBjqkAUzh5RjClxxFNjhT%2FUp3ckPKbkx2XPWZx2L9%2BLmh5NEEm7v1knsD3YB11il8Rc4beuRb80ZgBkMxPFSwXxT5y0yVqP8grbDlazJxbiijdQ2veTjqqYExe6p%2FotwMLLeJb5BDzhh8wnn6iKUCJIbx9Qk4P%2FwwkVAY8bET66Wj8%2BgSxjaI1nQYTIPD%2FhQYZNDCAOTOb3I0ps8Qec84ueo72iOQqbXH&X-Amz-Signature=f74c08d980fcf66762a97b48cfb28c2531d379be0121a4e4fc1c043a7093cf7f&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

![[리버스 프록시(Reverse Proxy)](https://www.cerberusftp.com/blog/four-benefits-of-using-a-reverse-proxy-server/)](https://prod-files-secure.s3.us-west-2.amazonaws.com/7b93557b-0386-4356-9156-9b6885e8c9eb/dc8938b6-8e87-4394-8cc2-23f4ba6dc472/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB46655KURNPS%2F20260805%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T152855Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEF4aCXVzLXdlc3QtMiJIMEYCIQDduWCwlHc1qR42gxG9%2FKpyJk5K15qk5phomNLgl%2Fg8OQIhALZKplkG4ghhnQEheeelE2qH4oV4d8skQaBvb2h8IxJhKv8DCCcQABoMNjM3NDIzMTgzODA1Igy6ZUR5Va%2F4aKMCRpcq3AMQxW%2FtSgXdrDjPB7%2F6rCEs1rMVDE9O2StYOBkfoCBrQh9pohm6faP5%2FEV3cz1TPWn7YLQzYtwnu77nFLokx2HbjTnLo9RWFkeqxsWmloOOA6v1YLqqoPqz4Xr%2FA8VvRfq4PSc%2B%2BJsfSV3nQrJVP3640r7udG%2BIx%2F3t6NGtMEHkBs0JGApvh7QTHEEiwnXAVyQzYZl5XXxbeDY45MskUwgFCUyM7OOrbGfbVxo9UY9zA3wP5sWito3Gv1kbEEme0v%2BVytwO5h%2FD%2F2lmqD6RHZvfQx3IOhd2mYIRmvZ4rGRO6FXbVl6y%2FPMcNrSWL22gl0LrRgeHaJBPTo3%2FdzByjiXrA4nw%2F1VErKKsiD%2FOFKtKnZT3A4RqeNwwD%2FJ4siFELPphOyb%2B4YcCihCTemmg3SNuRO7j5OIqQODqu38lgDqHcDGpl%2F%2BmawyAA4FGeqPbHhEJ7U03p96lclOa%2Fd2%2BC5GAhX6pHHYYO0z20Dxg2AfRhBs%2Fj8L4HlQ9bbwjBUH0nkD%2FVRVDHj3jS6NP72wqB06BNVnocGcoGRQjqJR32hPdtPT6QzE7EMmY7rw0MzqCiy%2FrMltgPzWAS38CZxBuSvWXKdFtXM3x6OHdQxZIiMvFMsB5KP0ZKpKbAe0lbTC8is3TBjqkAd8esQ2A8b7GjF37yjXWxVpQZuY9ZwfM519tL0bA6oN8AhCAFYCPRsP%2BhdK%2BW49amLv3bVcmanA%2BXVMpbDt4iU%2B5dDpkM%2BKi4knIDNpH8DVGw1gJToJHqjVhM8MNwzdan6NFGCCmlyY%2BaiYJUyn2Gn1vkph7ulKeCJ2F8JBvJOhj%2FmYRcQS4YqHPaQ%2Bj5ZKfYZAszlEP5%2BNxIODwDQjZELlA9MVo&X-Amz-Signature=4fd3088d16420e29ba50a80375b11b64da36369be1a52784b8719467a9f052a2&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)



구글의 원(origin) 서버는 미국 본사에 있다. 그렇다면 우리나라에서 요청을 보내고 응답 받기까지 물리적 거리가 먼 만큼 더 많은 시간이 소요될 것이다. 이를 위해 중간 계층인 **프록시 계층**이 존재한다. 포워드 프록시(Forward Proxy), 리버스 프록시(Reverse Proxy), CDN(Content Delivery Network), API 게이트웨로 세분화 할 수 있다. 우선 프록시 계층이 이를 포괄한다고 이해하고 넘어가자.

### 브라우저 렌더링

서버로부터 받은 HTML 파일을 브라우저의 렌더링 엔진이 처리한다. HTML 파일을 DOM으로, CSS 파일을 CSSOM으로 바꾼다. JS 파일을 실행한다. DOM과 CSSOM을 결합하여 렌더 트리를 생성하고, 요소의 크기를 계산하는 레이아웃 과정과 이후 페인트 과정을 통해 픽셀 단위로 화면에 요소를 그려낸다.

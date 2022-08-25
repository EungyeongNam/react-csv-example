import { useCallback, useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import { useQuery } from "react-query";

import { useAxios } from "~/use-axios";

interface IProps {
  created_at: string;
  updated_at: string;
  is_finished: string;
  user_name: string;
  user_phone_no: string;
  user_email: string;
}

export default function Index() {
  const { axiosInstance } = useAxios({});
  const [mount, setMount] = useState(false);
  const [header, setHeader] = useState<any>([]);
  const [appliesData, setAppliesData] = useState<any>([]);

  // const keyMap = {
  //   created_at: "최초작성",
  // }

  // data.map(key => ({
  //   key,
  //   label: keyMap[key]
  // }))

  const headers = [
    { label: "최초작성", key: "created_at" },
    { label: "지원 완료일", key: "updated_at" },
    { label: "지원작성 상태", key: "is_finished" },
    { label: "이름", key: "user_name" },
    { label: "연락처", key: "user_phone_no" },
    { label: "이메일", key: "user_email" },
    { label: "최종학력", key: "contents.0.education.label" },
    { label: "전공", key: "contents.0.major" },
    { label: "주소", key: "contents.0.sido.label" },
    { label: "상세주소", key: "contents.0.sigungu.label" },
    { label: "소속", key: "contents.0.department" },
    { label: "직무", key: "contents.0.job" },
    { label: "개인정보 수집 및 이용", key: "contents.0.privacy_policy_agree" },
    { label: "개인정보 제 3자 제공", key: "contents.0.shared_privacy_agree" },
    {
      label: "국민취업지원제도(구 취업성공패키지)에 참여 중이신가요?",
      key: "contents.1.is_qualified_kua",
    },
    {
      label: "참여 중인 국민취업지원제도 유형이 어떻게 되시나요?",
      key: "contents.1.kua_category",
    },
    {
      label: "국민내일배움카드를 소지하고 계시거나 발급받으실 수 있으신가요?",
      key: "contents.2.is_hrd_card",
    },
  ];

  const getApplyDate = useCallback(async () => {
    if (typeof window !== "undefined") {
      try {
        const result = await axiosInstance.get(
          `${window.ENV.API_ENDPOINT}/course/v1/courses/kdt-frontend-3rd/kdt-attr`
        );
        const { apply_items } = result.data.kdt_attr;

        let questionTitle: any[] = [];

        apply_items.map((data: any) =>
          Object.entries(data).forEach(([key, value]) => {
            if (["type"].includes(key)) {
              if (value === "custom") {
                questionTitle = data.data.map((v: any, index: number) => ({
                  label: v.title,
                  key: `contents.3.question_${index + 1}`,
                }));
              }
            }
          })
        );

        setHeader(headers.concat(questionTitle));
      } catch (error) {
        console.error(error);
      }
    }
  }, []);

  const getApplyListData = useCallback(async () => {
    if (typeof window !== "undefined") {
      try {
        return await axiosInstance.get(
          `${window.ENV.API_ENDPOINT}/course/v1/courses/kdt-frontend-3rd/kdt-applies`
        );
      } catch (error) {
        console.error(error);
      }
    }
  }, [axiosInstance]);

  // 은경 - 지원현황 데이터 불러오기
  const fetchApplyListData = useCallback(
    async ({ queryKey }) => {
      const [_key] = queryKey;
      const response = await getApplyListData();
      return response?.data;
    },
    [getApplyListData]
  );

  useQuery(["Applies"], fetchApplyListData, {
    onSuccess: (data) => {
      const result = data.data.filter(
        (v) => v.status !== "canceled" && v.status !== "inited"
      );

      // console.log(result);
      // const userKey = Object.keys(result[0])
      //   .map((v) => ({ key: v }))
      //   .filter(
      //     (key) =>
      //       key.key === "created_at" ||
      //       key.key === "updated_at" ||
      //       key.key === "is_finished" ||
      //       key.key === "user_name" ||
      //       key.key === "user_phone_no" ||
      //       key.key === "user_email"
      //   );

      //   const contentKey = result[0].contents.map((v, index) => Object.entries(v).forEach(([key, value]) => ({key})))
      // console.log(contentKey);

      setAppliesData(result);
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    void getApplyDate();

    if (typeof window !== "undefined") setMount(true);
  }, []);

  return (
    <div>
      <h1>CSV 다운로드</h1>
      {mount && (
        <CSVLink headers={header} data={appliesData} filename={`applies.csv`}>
          다운로드
        </CSVLink>
      )}
    </div>
  );
}

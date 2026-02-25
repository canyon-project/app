import { Link } from "react-router-dom";
import BasicLayout from "@/layouts/BasicLayout";

const IndexPage = () => {
  return (
    <BasicLayout>
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">欢迎</h1>
        <p className="text-gray-600 mb-6">
          这是一个基于 Vite + React + Hono 的全栈模板，使用 Prisma 作为 ORM，Ant Design 作为 UI 组件库。
        </p>
        <Link
          to="/posts"
          className="inline-block px-4 py-2 bg-[#0071c2] text-white rounded hover:opacity-90 transition-opacity"
        >
          管理文章
        </Link>
      </div>
    </BasicLayout>
  );
};

export default IndexPage;

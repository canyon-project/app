import type { FC, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Layout } from "antd";

const { Header, Content } = Layout;

const BasicLayout: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "首页" },
    { path: "/posts", label: "文章" },
    { path: "/settings", label: "设置" },
  ];

  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center gap-6 bg-white shadow-sm px-6">
        <Link to="/" className="text-lg font-semibold text-[#0071c2] hover:opacity-80">
          Vite + Hono
        </Link>
        <nav className="flex gap-4">
          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`px-3 py-2 rounded transition-colors ${
                location.pathname === path || (path !== "/" && location.pathname.startsWith(path))
                  ? "bg-[#0071c2]/10 text-[#0071c2] font-medium"
                  : "text-gray-600 hover:text-[#0071c2] hover:bg-gray-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </Header>
      <Content className="flex-1 p-6 bg-gray-50">{children}</Content>
    </Layout>
  );
};

export default BasicLayout;

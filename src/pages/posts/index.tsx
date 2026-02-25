import { Link } from "react-router-dom";
import { Button, Space, Table, Tag, message, Modal } from "antd";
import { useRequest } from "ahooks";
import type { ColumnsType } from "antd/es/table";
import BasicLayout from "@/layouts/BasicLayout";
import { getPosts, deletePost, type Post } from "@/services/post";
import dayjs from "dayjs";

const PostsPage = () => {
  const { data: posts = [], loading, refresh } = useRequest(getPosts);

  const handleDelete = (post: Post) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除文章「${post.title}」吗？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        await deletePost(post.id);
        message.success("删除成功");
        refresh();
      },
    });
  };

  const columns: ColumnsType<Post> = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
    },
    {
      title: "标题",
      dataIndex: "title",
      render: (title, record) => (
        <Link to={`/posts/${record.id}/edit`} className="text-[#0071c2] hover:underline">
          {title}
        </Link>
      ),
    },
    {
      title: "状态",
      dataIndex: "published",
      width: 100,
      render: (published: boolean) => (
        <Tag color={published ? "green" : "default"}>{published ? "已发布" : "草稿"}</Tag>
      ),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 180,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "action",
      width: 160,
      render: (_, record) => (
        <Space>
          <Link to={`/posts/${record.id}/edit`}>
            <Button type="link" size="small">
              编辑
            </Button>
          </Link>
          <Button type="link" danger size="small" onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <BasicLayout>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">文章列表</h1>
          <Link to="/posts/new">
            <Button type="primary">新建文章</Button>
          </Link>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={posts}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        />
      </div>
    </BasicLayout>
  );
};

export default PostsPage;

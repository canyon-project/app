import { Link } from "react-router-dom";
import { Button, Space, Table, Tag, message, Modal } from "antd";
import { useRequest } from "ahooks";
import type { ColumnsType } from "antd/es/table";
import BasicLayout from "@/layouts/BasicLayout";
import { getRepos, deleteRepo, type Repo } from "@/services/repo";
import dayjs from "dayjs";

const ReposPage = () => {
  const { data: repos = [], loading, refresh } = useRequest(getRepos);

  const handleDelete = (repo: Repo) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除仓库「${repo.pathWithNamespace}」吗？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        await deleteRepo(repo.id);
        message.success("删除成功");
        refresh();
      },
    });
  };

  const columns: ColumnsType<Repo> = [
    {
      title: "Provider",
      dataIndex: "provider",
      width: 100,
      render: (provider: string) => <Tag color="blue">{provider}</Tag>,
    },
    {
      title: "仓库",
      dataIndex: "pathWithNamespace",
      render: (pathWithNamespace, record) => (
        <Link
          to={`/repos/${encodeURIComponent(record.id)}/edit`}
          className="text-[#0071c2] hover:underline"
        >
          {pathWithNamespace}
        </Link>
      ),
    },
    {
      title: "描述",
      dataIndex: "description",
      ellipsis: true,
    },
    {
      title: "BU",
      dataIndex: "bu",
      width: 100,
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
          <Link to={`/repos/${encodeURIComponent(record.id)}/edit`}>
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
          <h1 className="text-xl font-semibold">仓库列表</h1>
          <Link to="/repos/new">
            <Button type="primary">新建仓库</Button>
          </Link>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={repos}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        />
      </div>
    </BasicLayout>
  );
};

export default ReposPage;

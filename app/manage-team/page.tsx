import ManageTeamForm from "./ManageTeamForm"

export default function ManageTeamPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
        Manage Team
      </h1>
      <ManageTeamForm />
    </div>
  )
}


"use client"

import { useState } from "react"
import TeamList from "../components/TeamList"
import ManageTeamForm from "./ManageTeamForm"

export default function ManageTeam() {
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
        Manage Teams
      </h1>

      {!showCreateForm ? (
        <div>
          <TeamList />
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create New Team
          </button>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setShowCreateForm(false)}
            className="mb-4 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Team List
          </button>
          <ManageTeamForm
            onTeamCreated={() => {
              setShowCreateForm(false)
            }}
          />
        </div>
      )}
    </div>
  )
}


"use client"

import { useState } from "react"
import TeamList from "../components/TeamList"
import ManageTeamForm from "./ManageTeamForm"

export default function ManageTeam() {
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Create Team Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Teams</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
        >
          Create Team
        </button>
      </div>
      
      {showCreateForm ? (
        <div>
          <button
            onClick={() => setShowCreateForm(false)}
            className="mb-4 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Team List
          </button>
          <ManageTeamForm
            isCreate={true}
            onTeamCreated={() => {
              setShowCreateForm(false)
            }}
          />
        </div>
      ) : (
        <div>
          <TeamList />
        </div>
      )}
    </div>
  )
}


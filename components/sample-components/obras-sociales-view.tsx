"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { FileText, MoreHorizontal, Trash2, Users, MapPin, Briefcase } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { deleteCandidate, createSampleCandidates, CandidateData } from "@/app/actions/candidates"
import CreateTalentDialog from "@/components/create-talent-dialog"

interface CandidatesViewProps {
  candidates: CandidateData[]
}

export default function CandidatesView({ candidates: initialCandidates }: CandidatesViewProps) {
  const [candidates, setCandidates] = useState(initialCandidates)
  const [isPending, startTransition] = useTransition()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [candidateToDelete, setCandidateToDelete] = useState<{ id: string; name: string } | null>(null)
  const router = useRouter()

  const handleOpen = (candidateId: string) => {
    router.push(`/protected/candidates/${candidateId}`)
  }

  const handleDeleteClick = (candidateId: string, candidateName: string) => {
    setCandidateToDelete({ id: candidateId, name: candidateName })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!candidateToDelete) return

    startTransition(async () => {
      try {
        await deleteCandidate(candidateToDelete.id)
        setCandidates(candidates.filter((candidate) => candidate.id !== candidateToDelete.id))
        toast.success("Candidate deleted successfully")
        setDeleteDialogOpen(false)
        setCandidateToDelete(null)
      } catch (error) {
        toast.error("Failed to delete candidate")
        console.error("Error deleting candidate:", error)
      }
    })
  }

  const handleCreateSamples = () => {
    startTransition(async () => {
      try {
        await createSampleCandidates()
        toast.success("Sample candidates created successfully")
        // Refresh the server component data
        router.refresh()
      } catch (error) {
        toast.error("Failed to create sample candidates")
        console.error("Error creating sample candidates:", error)
      }
    })
  }

  const handleCandidateCreated = (newCandidate: CandidateData) => {
    // Add the new candidate to the state for immediate UI update
    setCandidates(prev => [newCandidate, ...prev])
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase() || '??'
  }

  const getAvatarColor = (fullName: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-red-500",
    ]
    const index = fullName.length % colors.length
    return colors[index]
  }


  return (
    <TooltipProvider>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground">See all the candidates you&apos;ve reviewed, sourced or assessed, past and present</p>
        </div>
        <div className="flex gap-2">
          {candidates.length === 0 && (
            <Button 
              variant="outline" 
              onClick={handleCreateSamples}
              disabled={isPending}
            >
              Create Sample Data
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>Create Candidate</Button>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No candidates created yet</h3>
          <p className="text-muted-foreground mb-4">Add your first candidate to get started.</p>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleCreateSamples}
              disabled={isPending}
            >
              Create Sample Data
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>Create Candidate</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {candidates.map((candidate) => {
            const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Unknown Candidate'
            const location = candidate.country_name || candidate.country || "Unknown"

            return (
              <Card
                key={candidate.id}
                className="flex flex-col overflow-hidden rounded-lg border-border bg-card text-card-foreground shadow-md transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl min-h-[220px] max-h-[400px] w-full p-0 gap-2"
              >
                <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-4 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`h-10 w-10 rounded-full border-2 border-primary ${getAvatarColor(fullName)} flex items-center justify-center text-white font-medium text-sm`}
                    >
                      {getInitials(candidate.first_name, candidate.last_name)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <h3 className="text-sm font-semibold truncate">{fullName}</h3>
                      <p className="text-xs text-muted-foreground">{candidate.email || 'No email'}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={`Actions for ${fullName}`}
                        disabled={isPending}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(candidate.id, fullName)}
                        className="cursor-pointer text-destructive focus:text-destructive"
                        disabled={isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 px-4 py-2 min-h-0 flex flex-col overflow-hidden">
                  <div className="flex items-center text-xs text-foreground">
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{location}</span>
                  </div>
                  <div className="flex items-center text-xs text-foreground">
                    <Briefcase className="mr-2 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {candidate.years_experience 
                        ? `${candidate.years_experience} ${candidate.years_experience === 1 ? 'year' : 'years'} of experience`
                        : 'Experience not specified'
                      }
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto flex justify-between items-center border-t border-border bg-muted/30 px-4 pt-4 pb-4 flex-shrink-0 m-0">
                  <div className="flex gap-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => candidate.linkedin && window.open(candidate.linkedin, '_blank', 'noopener,noreferrer')}
                          disabled={!candidate.linkedin}
                          className={candidate.linkedin ? "" : "opacity-50 cursor-not-allowed"}
                        >
                          <Image 
                            src={candidate.linkedin ? "/linkedin-logo/linkedin-active.svg" : "/linkedin-logo/linkedin-inactive.svg"}
                            width={20}
                            height={20}
                            alt="LinkedIn"
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{candidate.linkedin ? "View LinkedIn Profile" : "No LinkedIn Profile"}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => candidate.resume_url && window.open(candidate.resume_url, '_blank', 'noopener,noreferrer')}
                          disabled={!candidate.resume_url}
                          className={candidate.resume_url ? "" : "opacity-50 cursor-not-allowed"}
                        >
                          <FileText className={`h-4 w-4 transition-colors ${candidate.resume_url ? "text-green-600 hover:text-green-700" : "text-muted-foreground"}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{candidate.resume_url ? "View Resume" : "No Resume Uploaded"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleOpen(candidate.id)}
                  >
                    Open
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
      </div>

      <CreateTalentDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCandidateCreated={handleCandidateCreated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {candidateToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCandidateToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}